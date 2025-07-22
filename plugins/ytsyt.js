const config = require('../config');
const { cmd } = require('../command');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');

// YouTube video download using RapidAPI
cmd({ 
    pattern: "yt4", 
    alias: ["youtube4", "video4"], 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "main", 
    use: '.yt <YouTube URL or search query>', 
    filename: __filename 
}, async (conn, mek, m, { from, prefix, quoted, q, reply }) => { 
    try { 
        if (!q) return await reply("Please provide a YouTube URL or video name.");
        
        // Check if it's a URL or search query
        let videoId;
        if (q.includes('youtu.be/') || q.includes('youtube.com/watch?v=')) {
            // Extract video ID from URL
            videoId = q.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)[1];
        } else {
            // Search for video
            const yt = await ytsearch(q);
            if (yt.results.length < 1) return reply("No results found!");
            
            const yts = yt.results[0];  
            videoId = yts.url.match(/[?&]v=([^&]+)/)[1];
            q = yts.url;
        }
        
        // Use RapidAPI to get download links
        const apiUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        });
        
        const data = await response.json();
        
        if (!data || !data.videos || data.videos.length === 0) {
            return reply("Failed to fetch the video. Please try again later.");
        }

        // Find the best quality video that has audio
        const videoWithAudio = data.videos.find(v => v.hasAudio && v.qualityLabel);
        if (!videoWithAudio) {
            return reply("No downloadable video found with audio.");
        }

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
        console.log(e);
        reply("An error occurred. Please try again later.");
    }
});

// YouTube audio download using RapidAPI
cmd({ 
    pattern: "song4", 
    alias: ["play4", "mp3"], 
    react: "🎶", 
    desc: "Download YouTube audio", 
    category: "main", 
    use: '.song <query or YouTube link>', 
    filename: __filename 
}, async (conn, mek, m, { from, sender, reply, q }) => { 
    try {
        if (!q) return reply("Please provide a song name or YouTube link.");

        let videoId;
        if (q.includes('youtu.be/') || q.includes('youtube.com/watch?v=')) {
            // Extract video ID from URL
            videoId = q.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)[1];
        } else {
            // Search for video
            const yt = await ytsearch(q);
            if (!yt.results.length) return reply("No results found!");

            const song = yt.results[0];
            videoId = song.url.match(/[?&]v=([^&]+)/)[1];
            q = song.url;
        }
        
        // Use RapidAPI to get download links
        const apiUrl = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        });
        
        const data = await response.json();
        
        if (!data || !data.audios || data.audios.length === 0) {
            return reply("Failed to fetch the audio. Please try again later.");
        }

        // Get the best quality audio
        const audio = data.audios.reduce((prev, current) => 
            (prev.bitrate > current.bitrate) ? prev : current
        );

        const songInfo = {
            title: data.title || "YouTube Audio",
            duration: data.duration || "N/A",
            author: data.author ? data.author.name : "Unknown",
            thumbnail: data.thumbnail ? data.thumbnail.url : null,
            downloadUrl: audio.url
        };

        await conn.sendMessage(from, {
            audio: { url: songInfo.downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `${songInfo.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: songInfo.title.length > 25 ? `${songInfo.title.substring(0, 22)}...` : songInfo.title,
                    body: "YouTube Audio Downloader",
                    mediaType: 1,
                    thumbnailUrl: songInfo.thumbnail || 'https://i.ytimg.com/vi/default.jpg',
                    sourceUrl: q,
                    mediaUrl: q,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error(error);
        reply("An error occurred. Please try again.");
    }
});
