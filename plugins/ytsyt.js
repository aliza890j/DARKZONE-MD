// YouTube video download using RapidAPI (with enhanced error handling)
cmd({ 
    pattern: "yt4", 
    alias: ["youtube", "video"], 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "main", 
    use: '.yt <YouTube URL or search query>', 
    filename: __filename 
}, async (conn, mek, m, { from, prefix, quoted, q, reply }) => { 
    try { 
        if (!q) return await reply("❌ Please provide a YouTube URL or video name.");
        
        // Check if it's a URL or search query
        let videoId;
        if (q.includes('youtu.be/') || q.includes('youtube.com/watch?v=')) {
            try {
                videoId = q.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)[1];
                if (!videoId) return reply("❌ Invalid YouTube URL. Please provide a valid link.");
            } catch (e) {
                console.error("URL parsing error:", e);
                return reply("❌ Error parsing YouTube URL. Make sure it's a valid link.");
            }
        } else {
            try {
                const yt = await ytsearch(q);
                if (yt.results.length < 1) return reply("❌ No results found for your search!");
                
                const yts = yt.results[0];  
                videoId = yts.url.match(/[?&]v=([^&]+)/)[1];
                q = yts.url;
            } catch (e) {
                console.error("Search error:", e);
                return reply("❌ Error searching YouTube. Please try again.");
            }
        }
        
        // Use RapidAPI to get download links
        const apiUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;
        
        let response;
        try {
            response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
                    'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
                }
            });
            
            if (!response.ok) {
                console.error("API Response not OK:", response.status, response.statusText);
                return reply(`❌ API Error: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            console.error("API Request failed:", e);
            return reply("❌ Failed to connect to download service. Please try again later.");
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error("JSON Parsing error:", e);
            return reply("❌ Error processing video information. Please try a different video.");
        }
        
        if (!data || !data.videos || data.videos.length === 0) {
            console.error("No videos in response:", data);
            return reply("❌ No downloadable video found. This video may be restricted.");
        }

        // Find the best quality video that has audio
        const videoWithAudio = data.videos.find(v => v.hasAudio && v.qualityLabel);
        if (!videoWithAudio) {
            console.error("No video with audio found:", data.videos);
            return reply("❌ No video with audio found. Try a different video.");
        }

        try {
            const videoInfo = {
                title: data.title || "YouTube Video",
                duration: data.duration || "N/A",
                views: data.viewCount ? parseInt(data.viewCount).toLocaleString() : "N/A",
                author: data.author ? data.author.name : "Unknown",
                url: q,
                downloadUrl: videoWithAudio.url
            };

            let ytmsg = `📹 *YouTube Video Downloader*
🎬 *Title:* ${videoInfo.title}
⏳ *Duration:* ${videoInfo.duration}
👀 *Views:* ${videoInfo.views}
👤 *Author:* ${videoInfo.author}
🔗 *Link:* ${videoInfo.url}
> Powered by RapidAPI`;

            // Send video directly with caption
            await conn.sendMessage(
                from, 
                { 
                    video: { url: videoInfo.downloadUrl }, 
                    caption: ytmsg,
                    mimetype: "video/mp4"
                }, 
                { quoted: mek }
            );
        } catch (e) {
            console.error("Message sending error:", e);
            reply("❌ Error sending video. The file might be too large.");
        }

    } catch (e) {
        console.error("Global error:", e);
        reply(`❌ An error occurred: ${e.message}\nPlease try again later.`);
    }
});
