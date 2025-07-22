const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');
const ytdl = require('ytdl-core');

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
        
        // Check if it's a URL
        if (ytdl.validateURL(q)) {
            videoUrl = q;
            const info = await ytdl.getInfo(q);
            title = info.videoDetails.title;
            thumbnail = info.videoDetails.thumbnails[0].url;
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        await reply("⏳ Downloading audio...");

        // Send thumbnail first
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎧 *${title}*`
        }, { quoted: mek });

        // Download audio stream directly
        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        await conn.sendMessage(from, {
            audio: { stream: audioStream },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!\n\nPowered by Irfan Ahmed`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}\n\n⚠️ If you got "can't load audio" error, please try again later or use another song.\n\nPowered by Irfan Ahmed`);
    }
});
