const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');

// Initialize YouTube API client
const youtube = google.youtube({
    version: 'v3',
    auth: 'AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A' // Your provided API key
});

cmd({
    pattern: "son",
    alias: ["music", "play"],
    react: "🎵",
    desc: "Search and download a song from YouTube with thumbnail and credits",
    category: "download",
    use: ".song <song name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name!");

        await reply("🔍 Searching for the song...");

        // Search YouTube using YouTube Data API
        const searchResponse = await youtube.search.list({
            part: 'snippet',
            q: q,
            maxResults: 1,
            type: 'video'
        });

        if (!searchResponse.data.items.length) return await reply("❌ No results found!");

        const video = searchResponse.data.items[0];
        const videoId = video.id.videoId;
        const title = video.snippet.title;
        const thumbnail = video.snippet.thumbnails.high.url;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Send thumbnail
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n\nDownloading your song...`
        }, { quoted: mek });

        // Use external API to download audio
        const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.success) return await reply("❌ Failed to download audio!");

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: data.result.download_url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // Send credits
        await reply(`✅ *${title}* downloaded successfully!\n\n*Credits:*\n- DarkZone\n- Irfan Ahmad`);

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
}); 
