const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core'); // Install with: npm install ytdl-core

// YouTube API Key
const YT_API_KEY = "AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A";

cmd({
    pattern: "song",
    alias: ["play", "music"],
    react: "🎵",
    desc: "Download audio from YouTube using Google API",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoId, title, thumbnailUrl;

        // Process YouTube URL
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            try {
                // Extract video ID from various URL formats
                const urlObj = new URL(q.includes('://') ? q : 'https://' + q);
                videoId = urlObj.hostname === 'youtu.be' 
                    ? urlObj.pathname.slice(1)
                    : urlObj.searchParams.get('v');
                
                if (!videoId || videoId.length !== 11) throw new Error("Invalid URL");
            } catch (e) {
                return await reply("❌ Invalid YouTube URL!");
            }
        } 
        // Process search query
        else {
            await reply("🔍 Searching YouTube...");
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(q)}&key=${YT_API_KEY}&type=video`;
            
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            
            if (!searchData.items || searchData.items.length === 0) {
                return await reply("❌ No results found!");
            }
            
            videoId = searchData.items[0].id.videoId;
        }

        // Get video details using your API key
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YT_API_KEY}`;
        const videoRes = await fetch(videoUrl);
        const videoData = await videoRes.json();
        
        if (!videoData.items || videoData.items.length === 0) {
            return await reply("❌ Video not found!");
        }
        
        const videoInfo = videoData.items[0];
        title = videoInfo.snippet.title;
        thumbnailUrl = videoInfo.snippet.thumbnails.high.url;
        
        await reply(`⏳ Downloading: *${title}*`);
        
        // Download audio stream directly using ytdl-core
        const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
            filter: 'audioonly',
            quality: 'highestaudio',
        });

        // Collect audio chunks
        const chunks = [];
        audioStream.on('data', (chunk) => chunks.push(chunk));
        audioStream.on('end', async () => {
            const audioBuffer = Buffer.concat(chunks);
            
            await conn.sendMessage(
                from, 
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title.replace(/[^\w\s]/gi, '')}.mp3`,
                    ptt: false
                }, 
                { quoted: mek }
            );
            
            await reply(`✅ Download complete!\nPOWERED BY IRFAN AHMED`);
        });
        
        audioStream.on('error', async (err) => {
            console.error('Stream error:', err);
            await reply(`❌ Download failed: ${err.message}`);
        });

    } catch (error) {
        console.error('Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});
