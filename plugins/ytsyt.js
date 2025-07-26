const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const crypto = require('crypto');
const fetch = require('node-fetch');

// Savetube utility functions
const savetube = {
    crypto: {
        hexToBuffer: (hex) => Buffer.from(hex, 'hex')
    },
    decrypt: async (enc) => {
        try {
            const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
            const data = Buffer.from(enc, 'base64');
            const iv = data.slice(0, 16);
            const content = data.slice(16);
            const key = savetube.crypto.hexToBuffer(secretKey);
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decrypted = decipher.update(content);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return JSON.parse(decrypted.toString());
        } catch (error) {
            throw new Error(error)
        }
    },
    youtube: url => {
        if (!url) return null;
        const a = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
        ];
        for (let b of a) {
            if (b.test(url)) return url.match(b)[1];
        }
        return null
    },
    download: async (url, type = 'mp3') => {
        // This would be your actual savetube download implementation
        // For now, we'll mock it with the API you provided earlier
        try {
            const apiUrl = `https://api.davidcyriltech.my.id/download/yt${type === 'mp3' ? 'mp3' : 'mp4'}?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            return await response.json();
        } catch (error) {
            throw error;
        }
    }
};

cmd({
    pattern: "son",
    alias: ["play", "music", "yt"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoUrl, title;
        
        // Check if it's a URL
        if (q.match(/(youtube\.com|youtu\.be)/)) {
            videoUrl = q;
            const videoId = savetube.youtube(q);
            if (!videoId) return await reply("❌ Invalid YouTube URL!");
            const videoInfo = await yts({ videoId });
            title = videoInfo.title;
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
        }

        await reply("⏳ Downloading audio... Please wait...");

        // Try savetube download first
        let result;
        try {
            result = await savetube.download(videoUrl, 'mp3');
            
            if (!result || !result.status || !result.result || !result.result.download_url) {
                throw new Error("Savetube download failed");
            }
            
            await conn.sendMessage(from, {
                audio: { url: result.result.download_url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            return await reply(`✅ *${title}* downloaded successfully!`);
            
        } catch (savetubeError) {
            console.log("Savetube failed, falling back to API", savetubeError);
            
            // Fallback to the original API
            const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.success) return await reply("❌ Failed to download audio!");

            await conn.sendMessage(from, {
                audio: { url: data.result.download_url },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            return await reply(`✅ *${title}* downloaded successfully!`);
        }

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
});
