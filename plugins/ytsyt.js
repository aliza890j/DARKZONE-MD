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

        let videoUrl, title, thumbnail;
        
        // URL validation and info extraction
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = q;
            const search = await yts({ videoId: q.split(/[=/]/).pop() });
            title = search.title;
            thumbnail = search.thumbnail;
        } else {
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        // 1. First send thumbnail image
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*`
        }, { quoted: mek });

        // 2. Then send the audio
        const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data.success) return await reply("❌ Audio download failed!");

        await conn.sendMessage(from, {
            audio: { url: response.data.result.download_url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // 3. Finally send your mod name
        await reply(`✅ Download successful!\n\n📌 *Mod by Irfan Ahmed*`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}\n\n📌 *Mod by Irfan Ahmed*`);
    }
});
