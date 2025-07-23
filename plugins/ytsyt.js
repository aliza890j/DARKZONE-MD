const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');

cmd({
    pattern: "son",
    alias: ["music", "download"],
    react: "🎵",
    desc: "Download songs from YouTube",
    category: "download",
    use: ".song <song name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please enter a song name!");

        // Search YouTube
        const search = await yts(q);
        if (!search.videos.length) return await reply("❌ No results found!");
        
        const video = search.videos[0];
        const title = video.title;
        const thumbnail = video.thumbnail;
        const videoUrl = video.url;

        // Send song photo
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*`
        }, { quoted: mek });

        // Downloading message
        await reply("⏳ Downloading your song...");

        // Download audio using API
        const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.success) return await reply("❌ Download failed!");

        // Send audio
        await conn.sendMessage(from, {
            audio: { url: data.result.download_url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // Send footer with dark zone
        const darkZone = `
┌─\n│\n│\n│\n╰────────────
`.repeat(5);
        
        await conn.sendMessage(from, {
            text: `${darkZone}\n*Irfan Ahmad*\n${darkZone}`,
            contextInfo: {
                externalAdReply: {
                    title: "Song Downloader",
                    body: "Completed Successfully",
                    thumbnail: await (await fetch(thumbnail)).buffer(),
                    mediaType: 2,
                    mediaUrl: videoUrl,
                    sourceUrl: videoUrl
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
});
