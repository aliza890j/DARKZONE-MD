const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "music5",
    alias: ["play5", "song5", "7digital"],
    react: "🎵",
    desc: "Search and stream music from 7digital API",
    category: "download",
    use: ".music <query>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ *Please provide a song name!*\nExample: .music Shape of You");

        await reply("🔍 *Searching for your music...*");

        // 7digital API configuration
        const apiConfig = {
            baseURL: 'https://api.7digital.com/1.2/',
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${config.SEVENDIGITAL_API_KEY}` // Add your API key to config
            },
            params: {
                q: q,
                country: 'US',
                pageSize: 5,
                usageTypes: 'download,streaming'
            }
        };

        // Search 7digital catalog
        const searchResponse = await axios.get('track/search', apiConfig);
        const tracks = searchResponse.data?.searchResults?.searchResult;
        
        if (!tracks || tracks.length === 0) {
            return await reply("❌ *No results found on 7digital!* Trying YouTube instead...");
            
            // Fallback to YouTube if 7digital fails
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ *No results found anywhere!*");
            
            const videoUrl = search.videos[0].url;
            const title = search.videos[0].title;
            
            await reply("⏳ *Downloading audio from YouTube...*");
            
            const ytApiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const ytResponse = await axios.get(ytApiUrl);
            
            if (!ytResponse.data.success) return await reply("❌ *Failed to download audio!*");
            
            await conn.sendMessage(from, {
                audio: { url: ytResponse.data.result.download_url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
            
            return await reply(`✅ *${title}* downloaded from YouTube!`);
        }

        // Get the first track
        const track = tracks[0];
        const streamUrl = track.releases[0]?.track?.streamingUrl;
        
        if (!streamUrl) {
            return await reply("❌ *Streaming not available for this track*");
        }

        await reply(`🎧 *Now playing:* ${track.title} - ${track.artist.name}`);

        // Send the audio stream
        await conn.sendMessage(from, {
            audio: { url: streamUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: track.title,
                    body: `by ${track.artist.name} | via 7digital`,
                    thumbnail: await (await axios.get(track.image, { responseType: 'arraybuffer' })).data
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('Music API Error:', error);
        await reply(`❌ *Error!* ${error.response?.data?.message || error.message}\nTrying YouTube fallback...`);
        
        // YouTube fallback
        try {
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ *No results found anywhere!*");
            
            const videoUrl = search.videos[0].url;
            const title = search.videos[0].title;
            
            await reply("⏳ *Downloading audio from YouTube...*");
            
            const ytApiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const ytResponse = await axios.get(ytApiUrl);
            
            if (!ytResponse.data.success) return await reply("❌ *Failed to download audio!*");
            
            await conn.sendMessage(from, {
                audio: { url: ytResponse.data.result.download_url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
            
            await reply(`✅ *${title}* downloaded from YouTube!`);
        } catch (ytError) {
            await reply("❌ *Failed to get music from all sources!* Please try again later.");
        }
    }
});
