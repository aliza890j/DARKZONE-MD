const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const { exec } = require('child_process');

cmd({
    pattern: "son",
    alias: ["play", "music"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoUrl, title, thumbnail;
        
        // URL validation and info extraction
        if (ytdl.validateURL(q)) {
            const info = await ytdl.getInfo(q);
            videoUrl = q;
            title = info.videoDetails.title;
            thumbnail = info.videoDetails.thumbnails.pop().url;
        } else {
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        await reply("⏳ Processing your request...");

        // Send thumbnail first
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*`
        }, { quoted: mek });

        // Temporary file paths
        const tempFile = `./temp/${Date.now()}.mp3`;
        const videoId = ytdl.getURLVideoID(videoUrl);

        // Method 1: Try ytdl-core first
        try {
            const audioStream = ytdl(videoUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            await conn.sendMessage(from, {
                audio: { stream: audioStream },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            return await reply(`✅ *${title}* sent successfully!\n\nPowered by Irfan Ahmed`);
        } catch (ytdlError) {
            console.log('Ytdl method failed, trying fallback...');
        }

        // Method 2: Fallback to youtube-dl if available
        try {
            await new Promise((resolve, reject) => {
                exec(`youtube-dl -x --audio-format mp3 -o "${tempFile}" ${videoUrl}`, 
                async (error) => {
                    if (error) reject(error);
                    
                    await conn.sendMessage(from, {
                        audio: fs.readFileSync(tempFile),
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: mek });
                    
                    fs.unlinkSync(tempFile);
                    resolve();
                });
            });
            
            return await reply(`✅ *${title}* sent successfully!\n\nPowered by Irfan Ahmed`);
        } catch (execError) {
            console.log('Youtube-dl method failed, trying final fallback...');
        }

        // Method 3: Final fallback using API
        try {
            const apiResponse = await axios.get(`https://api.davidcyriltech.my.id/download/ytmp3?id=${videoId}`);
            if (apiResponse.data.success) {
                await conn.sendMessage(from, {
                    audio: { url: apiResponse.data.result.download_url },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
                
                return await reply(`✅ *${title}* sent successfully!\n\nPowered by Irfan Ahmed`);
            }
        } catch (apiError) {
            console.log('API method failed');
        }

        // If all methods fail
        throw new Error('All download methods failed. Please try again later.');

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: Failed to process your request\n\n🔧 Try these solutions:\n1. Try a different song\n2. Wait a few minutes\n3. Check if YouTube is blocking\n\nPowered by Irfan Ahmed`);
    }
});
