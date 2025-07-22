const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');

cmd({
    pattern: "yt22",
    alias: ["play2", "music"],
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
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = q;
            const videoInfo = await yts({ videoId: q.split(/[=/]/).pop() });
            title = videoInfo.title;
            thumbnail = videoInfo.thumbnail;
        } else {
            // Search YouTube using official API with your key
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        await reply("⏳ Downloading audio...");

        // Use YouTube official API with your API key
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoUrl.split(/[=/]/).pop()}&key=AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.items || !data.items.length) return await reply("❌ Failed to fetch audio details!");

        // Beautiful audio player design
        const audioMessage = {
            audio: { url: `https://yt-downloader.herokuapp.com/download?url=${encodeURIComponent(videoUrl)}` },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "🎧 YouTube Audio Player",
                    thumbnail: thumbnail,
                    mediaType: 2,
                    mediaUrl: videoUrl,
                    sourceUrl: videoUrl
                }
            }
        };

        await conn.sendMessage(from, audioMessage, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!\n🎵 Now playing in beautiful audio player`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
});
