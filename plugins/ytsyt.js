const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "son",
    alias: ["yt", "ytaudio"],
    desc: "Download audio from YouTube",
    category: "download",
    use: "<song name or YouTube URL>",
    react: "🎶"
}, async (message, client, args) => {
    try {
        if (!args[0]) return message.reply("Please provide a song name or YouTube URL!");

        let videoUrl, videoInfo;

        // Check if input is a URL
        if (args[0].match(/youtube\.com|youtu\.be/)) {
            videoUrl = args[0];
            const videoId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)[1];
            videoInfo = await yts({ videoId });
        } 
        // Search YouTube if not a URL
        else {
            const searchResults = await yts(args.join(" "));
            if (!searchResults.videos.length) return message.reply("No results found!");
            videoUrl = searchResults.videos[0].url;
            videoInfo = searchResults.videos[0];
        }

        // Send thumbnail + metadata
        await message.reply(`🎧 *${videoInfo.title}*\n⬇️ Downloading...`, {
            thumbnail: videoInfo.thumbnail
        });

        // Fetch download link from API (e.g., savetube.me)
        const apiUrl = `https://api.savetube.me/download?url=${encodeURIComponent(videoUrl)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.downloadUrl) throw new Error("Failed to fetch download link");

        // Download and send audio (FIXED PART)
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const tempFile = path.join(tempDir, `${Date.now()}.mp3`);
        const writer = fs.createWriteStream(tempFile);
        const audioStream = await axios.get(data.downloadUrl, { responseType: "stream" });
        
        // Wait for download to complete
        await new Promise((resolve, reject) => {
            audioStream.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        await client.sendMessage(message.jid, {
            audio: fs.readFileSync(tempFile),
            mimetype: "audio/mpeg",
            ptt: false
        }, { quoted: message });

        // Cleanup
        setTimeout(() => fs.unlinkSync(tempFile), 5000);
    } catch (err) {
        message.reply(`❌ Error: ${err.message}`);
    }
});
