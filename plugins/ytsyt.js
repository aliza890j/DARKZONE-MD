const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');
const ytdl = require('ytdl-core'); // Add this package
const fs = require('fs');
const { tmpdir } = require('os');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

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

        let videoUrl, title;
        
        // Check if it's a URL
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = q;
            const videoInfo = await yts({ videoId: q.split(/[=/]/).pop() });
            title = videoInfo.title;
        } else {
            // Search YouTube
            const searchResults = await yts(q);
            if (!searchResults.videos.length) return await reply("❌ No results found!");
            
            videoUrl = searchResults.videos[0].url;
            title = searchResults.videos[0].title;
        }

        await reply("⏳ Downloading audio...");

        // Generate temporary file path
        const tempFile = `${tmpdir()}/${Math.random().toString(36).substring(2, 9)}.mp3`;
        
        // Download and convert to audio
        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });
        
        await pipeline(audioStream, fs.createWriteStream(tempFile));
        
        // Send audio file
        await conn.sendMessage(from, {
            audio: fs.readFileSync(tempFile),
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // Clean up
        fs.unlinkSync(tempFile);

        await reply(`✅ *${title}* downloaded successfully!\n\nPowered by Irfan Ahmed`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}\n\nPowered by Irfan Ahmed`);
    }
});
