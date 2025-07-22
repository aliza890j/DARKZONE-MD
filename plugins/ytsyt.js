const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

function replaceYouTubeID(url) {
    const regex = /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

cmd({
    pattern: "son",
    alias: ["music", "ytmusic"],
    react: "🎵",
    desc: "Download YouTube music",
    category: "download",
    use: ".song <song name or YouTube URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let id = q.startsWith("https://") ? replaceYouTubeID(q) : null;
        let videoInfo;

        // If not a URL, search YouTube
        if (!id) {
            const searchResults = await yts(q);
            if (!searchResults.videos.length) return await reply("❌ No results found!");
            id = searchResults.videos[0].videoId;
            videoInfo = searchResults.videos[0];
        } else {
            // If it's a URL, get video info
            videoInfo = await ytdl.getInfo(id);
            videoInfo = {
                title: videoInfo.videoDetails.title,
                duration: videoInfo.videoDetails.lengthSeconds,
                views: videoInfo.videoDetails.viewCount,
                author: videoInfo.videoDetails.author.name,
                url: videoInfo.videoDetails.video_url,
                thumbnail: videoInfo.videoDetails.thumbnails[0].url
            };
        }

        const { title, duration, views, author, url, thumbnail } = videoInfo;

        // Format duration from seconds to HH:MM:SS
        const formattedDuration = new Date(duration * 1000).toISOString().substr(11, 8);

        let info = `🎵 *YouTube Music Downloader* 🎵\n\n` +
            `📌 *Title:* ${title || "Unknown"}\n` +
            `⏳ *Duration:* ${formattedDuration || "Unknown"}\n` +
            `👀 *Views:* ${views || "Unknown"}\n` +
            `👤 *Artist:* ${author || "Unknown"}\n` +
            `🔗 *URL:* ${url || "Unknown"}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1. Audio (MP3) 🎧\n` +
            `2. Video (MP4) 🎥\n\n` +
            `${config.FOOTER || "DARKZONE-MD"}`;

        const sentMsg = await conn.sendMessage(from, { 
            image: { url: thumbnail }, 
            caption: info 
        }, { quoted: mek });
        
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🎶', key: sentMsg.key } });

        // Temporary listener for user response
        const responseListener = async (messageUpdate) => {
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || 
                                  mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                // Remove the listener after getting the response
                conn.ev.off('messages.upsert', responseListener);

                let userReply = messageType.trim().toLowerCase();
                let processingMsg = await conn.sendMessage(from, { text: "⏳ Processing your request..." }, { quoted: mek });

                if (userReply === '1' || userReply === 'audio' || userReply === 'mp3') {
                    // Download as MP3
                    const audioStream = ytdl(`https://www.youtube.com/watch?v=${id}`, {
                        filter: 'audioonly',
                        quality: 'highestaudio'
                    });

                    const tempFile = path.join(__dirname, `temp_${id}.mp3`);
                    const writeStream = fs.createWriteStream(tempFile);
                    
                    audioStream.pipe(writeStream);
                    
                    writeStream.on('finish', async () => {
                        await conn.sendMessage(from, {
                            audio: fs.readFileSync(tempFile),
                            mimetype: 'audio/mpeg',
                            fileName: `${title}.mp3`
                        }, { quoted: mek });
                        
                        fs.unlinkSync(tempFile);
                        await conn.sendMessage(from, { 
                            text: '✅ Audio download complete! ✅',
                            edit: processingMsg.key 
                        });
                    });

                } else if (userReply === '2' || userReply === 'video' || userReply === 'mp4') {
                    // Download as MP4
                    const videoStream = ytdl(`https://www.youtube.com/watch?v=${id}`, {
                        quality: 'highest',
                        filter: format => format.container === 'mp4'
                    });

                    const tempFile = path.join(__dirname, `temp_${id}.mp4`);
                    const writeStream = fs.createWriteStream(tempFile);
                    
                    videoStream.pipe(writeStream);
                    
                    writeStream.on('finish', async () => {
                        await conn.sendMessage(from, {
                            video: fs.readFileSync(tempFile),
                            mimetype: 'video/mp4',
                            caption: title,
                            fileName: `${title}.mp4`
                        }, { quoted: mek });
                        
                        fs.unlinkSync(tempFile);
                        await conn.sendMessage(from, { 
                            text: '✅ Video download complete! ✅',
                            edit: processingMsg.key 
                        });
                    });

                } else {
                    await conn.sendMessage(from, { 
                        text: '❌ Invalid choice! Please reply with 1 (for MP3) or 2 (for MP4).',
                        edit: processingMsg.key 
                    });
                }

            } catch (error) {
                console.error(error);
                await reply(`❌ Error processing your request: ${error.message}`);
            }
        };

        // Add the listener
        conn.ev.on('messages.upsert', responseListener);

        // Timeout for no response
        setTimeout(() => {
            conn.ev.off('messages.upsert', responseListener);
        }, 60000); // 1 minute timeout

    } catch (error) {
        console.error(error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ An error occurred: ${error.message || "Error!"}`);
    }
});
