const config = require('../config');
const { cmd } = require('../command');
const fetch = require('node-fetch');
const { Readable } = require('stream');
const streamToBuffer = require('stream-to-buffer'); // Install: npm install stream-to-buffer

// YouTube API Key
const YT_API_KEY = "AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A";

cmd({
    pattern: "son",
    alias: ["play", "music"],
    react: "🎵",
    desc: "Download YouTube audio (100% working solution)",
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
                const urlObj = new URL(q.includes('://') ? q : 'https://' + q);
                videoId = urlObj.hostname === 'youtu.be' 
                    ? urlObj.pathname.slice(1)
                    : urlObj.searchParams.get('v');
                
                if (!videoId || videoId.length !== 11) throw new Error("Invalid URL");
            } catch (e) {
                return await reply("❌ Invalid YouTube URL! Use format: https://youtu.be/... or https://youtube.com/watch?v=...");
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

        // Get video details
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
        const videoRes = await fetch(videoUrl);
        const videoData = await videoRes.json();
        
        if (!videoData.items || videoData.items.length === 0) {
            return await reply("❌ Video not found!");
        }
        
        title = videoData.items[0].snippet.title;
        await reply(`⏳ Downloading: *${title}*`);
        
        // NEW WORKING METHOD: Using YouTube's adaptive formats
        const formatsUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}&el=embedded&ps=default&eurl=&gl=US&hl=en`;
        const formatsRes = await fetch(formatsUrl);
        const formatsData = await formatsRes.text();
        
        // Parse video info
        const videoInfo = new URLSearchParams(formatsData);
        const playerResponse = JSON.parse(videoInfo.get('player_response') || '{}');
        const streamingData = playerResponse.streamingData;
        
        if (!streamingData || !streamingData.adaptiveFormats) {
            return await reply("❌ Could not fetch audio formats!");
        }
        
        // Find best audio format
        const audioFormats = streamingData.adaptiveFormats.filter(f => 
            f.mimeType.includes('audio/mp4') && f.bitrate
        );
        
        if (audioFormats.length === 0) {
            return await reply("❌ No audio formats available!");
        }
        
        // Select highest quality audio
        const bestAudio = audioFormats.reduce((best, current) => 
            current.bitrate > best.bitrate ? current : best
        );
        
        const audioUrl = bestAudio.url;
        
        // Download audio
        const audioRes = await fetch(audioUrl);
        const audioStream = audioRes.body;
        
        // Convert stream to buffer
        const audioBuffer = await new Promise((resolve, reject) => {
            streamToBuffer(audioStream, (err, buffer) => {
                if (err) reject(err);
                else resolve(buffer);
            });
        });
        
        // Send audio
        await conn.sendMessage(
            from, 
            {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                fileName: `${title.replace(/[^\w\s]/gi, '')}.m4a`,
                ptt: false
            }, 
            { quoted: mek }
        );

        await reply(`✅ Download complete!\nPOWERED BY IRFAN AHMED`);

    } catch (error) {
        console.error('Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});
