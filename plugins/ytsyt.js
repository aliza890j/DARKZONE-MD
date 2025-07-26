const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
        // Your savetube download implementation would go here
        // This is just a placeholder structure
        return {
            status: true,
            result: {
                title: "YouTube Video",
                thumbnail: "https://i.ytimg.com/vi/.../default.jpg",
                download: "https://example.com/audio.mp3"
            }
        };
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

        // Download using savetube
        let result;
        try {
            result = await savetube.download(videoUrl, 'mp3');
        } catch (err) {
            return await conn.sendMessage(from, { text: "Failed to fetch download link. Try again later." }, { quoted: mek });
        }
        
        if (!result || !result.status || !result.result || !result.result.download) {
            return await conn.sendMessage(from, { text: "Failed to get a valid download link from the API." }, { quoted: mek });
        }

        // Send thumbnail and title first
        let sentMsg;
        try {
            sentMsg = await conn.sendMessage(from, {
                image: { url: result.result.thumbnail },
                caption: `*${result.result.title}*\n\n> _Downloading your song..._\n > *_By Knight Bot MD_*`
            }, { quoted: mek });
        } catch (e) {
            // If thumbnail fails, fallback to just sending the audio
            sentMsg = mek;
        }

        // Download the MP3 file
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFile = path.join(tempDir, `${Date.now()}.mp3`);
        
        try {
            const response = await axios({ 
                url: result.result.download, 
                method: 'GET', 
                responseType: 'stream' 
            });
            
            if (response.status !== 200) {
                return await conn.sendMessage(from, { text: "Failed to download the song file from the server." }, { quoted: mek });
            }
            
            const writer = fs.createWriteStream(tempFile);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Send the audio file
            await conn.sendMessage(from, {
                audio: fs.readFileSync(tempFile),
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            // Clean up
            fs.unlinkSync(tempFile);
            
            return await reply(`✅ *${result.result.title}* downloaded successfully!`);

        } catch (error) {
            console.error(error);
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            return await reply(`❌ Error: ${error.message}`);
        }

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
});
