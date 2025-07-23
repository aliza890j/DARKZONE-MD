const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

cmd({
    pattern: "son",
    alias: ["music", "download"],
    react: "🎵",
    desc: "Download high-quality songs from YouTube",
    category: "download",
    use: ".song <song name>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please enter a song name!");

        // Step 1: Search YouTube
        const search = await yts(q);
        if (!search.videos.length) return await reply("❌ No results found!");
        
        const video = search.videos[0];
        const title = video.title;
        const thumbnail = video.thumbnail;
        const videoUrl = video.url;

        // Send song thumbnail and title
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n\n⬇️ Starting download...`
        }, { quoted: mek });

        // Step 2: Download and convert audio
        await reply("⏳ Downloading and converting audio...");

        // Create temporary files
        const tempDir = './temp/';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const videoId = video.videoId;
        const tempVideo = path.join(tempDir, `${videoId}.mp4`);
        const tempAudio = path.join(tempDir, `${videoId}.mp3`);

        // Download audio using ytdl-core with bypass
        const videoStream = ytdl(videoUrl, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+917;'
                }
            }
        });

        // Save to temporary file
        const writeStream = fs.createWriteStream(tempVideo);
        videoStream.pipe(writeStream);

        // Wait for download to complete
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Convert to MP3 using FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideo)
                .setFfmpegPath(ffmpegPath)
                .audioBitrate(320)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(tempAudio);
        });

        // Step 3: Send audio
        await conn.sendMessage(from, {
            audio: fs.readFileSync(tempAudio),
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false
        }, { quoted: mek });

        // Step 4: Send dark zone footer
        const darkZone = '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛';
        await conn.sendMessage(from, {
            text: `${darkZone}\n*Irfan Ahmad*\n${darkZone}`,
            contextInfo: {
                externalAdReply: {
                    title: "Song Downloader",
                    body: "Download Complete!",
                    thumbnail: fs.readFileSync(tempVideo),
                    mediaType: 2,
                    mediaUrl: videoUrl,
                    sourceUrl: videoUrl
                }
            }
        }, { quoted: mek });

        // Cleanup temporary files
        fs.unlinkSync(tempVideo);
        fs.unlinkSync(tempAudio);

    } catch (error) {
        console.error('❌ Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});
