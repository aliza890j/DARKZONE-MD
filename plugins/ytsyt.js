const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

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
            // Search YouTube using API
            const searchResponse = await axios.get(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(q)}&key=AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A&type=video`
            );
            
            if (!searchResponse.data.items.length) return await reply("❌ No results found!");
            
            videoUrl = `https://youtu.be/${searchResponse.data.items[0].id.videoId}`;
            title = searchResponse.data.items[0].snippet.title;
        }

        await reply("⏳ Downloading audio...");

        // Use YouTube API to get audio
        const downloadResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoUrl.split(/[=/]/).pop()}&key=AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A`
        );

        if (!downloadResponse.data.items) return await reply("❌ Failed to download audio!");

        // Send audio file
        await conn.sendMessage(from, {
            audio: { url: videoUrl },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!\n\nPowered by Irfan Ahmed`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}\n\nPowered by Irfan Ahmed`);
    }
});
