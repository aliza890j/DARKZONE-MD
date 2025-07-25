const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

cmd({
    pattern: "son",
    alias: ["music", "ytmusic", "play"],
    react: "🎵",
    desc: "Download high quality audio from YouTube",
    category: "download",
    use: ".song <query or url> [quality: low/medium/high]",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎵 *YouTube Music Downloader*\n\n❌ Please provide a song name or YouTube URL!\n\nExample:\n.song Believer Imagine Dragons\n.song https://youtu.be/7wtfhZwyrcc");
        
        // Extract quality preference if provided
        const [query, quality] = q.split(/ (.+)/);
        const preferredQuality = quality && ['low', 'medium', 'high'].includes(quality.toLowerCase()) 
            ? quality.toLowerCase() 
            : 'high';

        let videoUrl, title, thumbnail, duration;
        
        // Check if it's a URL
        if (query.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = query;
            const videoId = query.split(/[=/]/).pop().split('?')[0];
            const videoInfo = await yts({ videoId });
            title = videoInfo.title;
            thumbnail = videoInfo.thumbnail;
            duration = videoInfo.duration.timestamp || 'N/A';
        } else {
            // Search YouTube
            await reply("🔍 Searching YouTube...");
            const search = await yts(query);
            if (!search.videos.length) return await reply("❌ No results found for your search!");
            
            const firstVideo = search.videos[0];
            videoUrl = firstVideo.url;
            title = firstVideo.title;
            thumbnail = firstVideo.thumbnail;
            duration = firstVideo.duration.timestamp || 'N/A';
        }

        // Send video info before downloading
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n⏱ Duration: ${duration}\n\n📥 Downloading ${preferredQuality} quality audio...\nPlease wait...`
        }, { quoted: mek });

        // Use yt-dlp to download audio directly (better quality than most APIs)
        const fileName = `./temp/${Date.now()}_${title.replace(/[^\w\s]/gi, '')}.mp3`;
        
        // Quality settings (bitrate)
        const qualityMap = {
            low: '--audio-quality 96K',
            medium: '--audio-quality 128K',
            high: '--audio-quality 192K'
        };
        
        const ytdlpCommand = `yt-dlp -x --audio-format mp3 ${qualityMap[preferredQuality]} -o "${fileName}" "${videoUrl}"`;
        
        await new Promise((resolve, reject) => {
            exec(ytdlpCommand, async (error) => {
                if (error) {
                    console.error(error);
                    return reject(new Error('Failed to download audio'));
                }
                
                try {
                    // Check file size
                    const stats = fs.statSync(fileName);
                    const fileSize = stats.size / (1024 * 1024); // in MB
                    
                    if (fileSize > 15) { // WhatsApp limit is around 16MB
                        fs.unlinkSync(fileName);
                        return reject(new Error('File too large for WhatsApp (max ~15MB)'));
                    }
                    
                    // Send audio file
                    await conn.sendMessage(from, {
                        audio: fs.readFileSync(fileName),
                        mimetype: 'audio/mpeg',
                        fileName: `${title}.mp3`.substring(0, 64) // WhatsApp has filename length limits
                    }, { quoted: mek });
                    
                    // Clean up
                    fs.unlinkSync(fileName);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        await reply(`✅ *${title}* downloaded successfully in ${preferredQuality} quality!`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}\n\nPlease try again or try a different video.`);
    }
});
