const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

cmd({
    pattern: "son",
    alias: ["play", "music", "ytmusic"],
    react: "🎵",
    desc: "Download high quality audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎵 *Please provide a song name or YouTube URL!*\nExample: .song Believer Imagine Dragons");

        // Show searching message
        await reply("🔍 *Searching for your song...*");
        
        let videoUrl, title, thumbnail;
        
        // Check if it's a URL
        if (ytdl.validateURL(q)) {
            const info = await ytdl.getInfo(q);
            videoUrl = q;
            title = info.videoDetails.title;
            thumbnail = info.videoDetails.thumbnails[0].url;
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ *No results found!* Try a different search term.");
            
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        // Send song info before downloading
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎧 *Now Downloading:* ${title}\n⏳ *Please wait...*`
        }, { quoted: mek });

        // Download options
        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
        });

        // Temporary file path
        const tempFile = `./temp/${Date.now()}.mp3`;
        
        await pipeline(
            audioStream,
            fs.createWriteStream(tempFile)
        );

        // Send audio file
        await conn.sendMessage(from, {
            audio: fs.readFileSync(tempFile),
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`.replace(/[^\w\s.-]/gi, '')
        }, { quoted: mek });

        // Clean up
        fs.unlinkSync(tempFile);
        
        await reply(`✅ *Download Complete!*\n🎶 *Title:* ${title}`);

    } catch (error) {
        console.error(error);
        await reply(`❌ *Error!* ${error.message}\nPlease try again later.`);
    }
});
