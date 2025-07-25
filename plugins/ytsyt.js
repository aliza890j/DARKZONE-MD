const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "ytg",
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
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        await reply("⏳ Downloading audio...");

        // First send thumbnail
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*`
        }, { quoted: mek });

        // Use API to get audio with better error handling
        const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        
        try {
            const response = await axios.get(apiUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.data || !response.data.success) {
                return await reply("❌ Failed to download audio: Invalid API response");
            }

            // Then send audio
            await conn.sendMessage(from, {
                audio: { url: response.data.result.download_url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            // Finally send the footer message
            await conn.sendMessage(from, {
                text: "Power of the Dark Zone MD"
            }, { quoted: mek });

        } catch (apiError) {
            console.error('API Error:', apiError);
            return await reply(`❌ API Error: ${apiError.message}`);
        }

    } catch (error) {
        console.error('Main Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});
