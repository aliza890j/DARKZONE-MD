const config = require('../config');
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["play", "music", "mp3"],
    react: "🎵",
    desc: "Download MP3 from YouTube using RapidAPI",
    category: "download",
    use: ".song <YouTube URL or Song Name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ *Please provide a YouTube URL or song name!*");

        let videoUrl, title;

        // If it's a search query, find the first YouTube result
        if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
            const search = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=${config.YOUTUBE_API_KEY}&maxResults=1`);
            if (!search.data.items.length) return await reply("❌ *No results found!*");
            videoUrl = `https://youtube.com/watch?v=${search.data.items[0].id.videoId}`;
            title = search.data.items[0].snippet.title;
        } else {
            videoUrl = q;
            // Extract video ID for title
            const videoId = q.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|youtu\.be\/)([^"&?\/\s]{11})/i)[1];
            const videoInfo = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${config.YOUTUBE_API_KEY}`);
            title = videoInfo.data.items[0].snippet.title;
        }

        await reply("⏳ *Downloading MP3... Please wait!*");

        // RapidAPI YouTube to MP3 Conversion
        const options = {
            method: 'GET',
            url: 'https://youtube-to-mp4.p.rapidapi.com/url=&title',
            params: {
                url: videoUrl,
                title: title
            },
            headers: {
                'x-rapidapi-host': 'youtube-to-mp4.p.rapidapi.com',
                'x-rapidapi-key': config.RAPIDAPI_KEY // Add your key in config.js
            }
        };

        const response = await axios.request(options);
        
        if (!response.data || !response.data.downloadUrl) {
            return await reply("❌ *Failed to download MP3!*");
        }

        await conn.sendMessage(from, {
            audio: { url: response.data.downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Downloaded via RapidAPI",
                    thumbnail: (await axios.get(`https://img.youtube.com/vi/${videoUrl.split('v=')[1].split('&')[0]}/0.jpg`, { responseType: 'arraybuffer' })).data
                }
            }
        }, { quoted: mek });

        await reply(`✅ *Downloaded Successfully!*\n🎧 *Title:* ${title}`);

    } catch (error) {
        console.error("Song Download Error:", error);
        await reply(`❌ *Error!* ${error.message || "Failed to process request."}`);
    }
});
