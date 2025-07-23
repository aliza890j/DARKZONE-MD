const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

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

        // Step 1: Send song photo
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n\n_⬇️ Download starting..._`
        }, { quoted: mek });

        // Step 2: Process and send audio
        await reply("⏳ Processing audio...");
        
        const audioStream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25 // 32MB buffer
        });

        const chunks = [];
        audioStream.on('data', chunk => chunks.push(chunk));
        audioStream.on('end', async () => {
            const audioBuffer = Buffer.concat(chunks);
            
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });

            // Step 3: Send footer with dark zone
            const darkZone = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
            await conn.sendMessage(from, {
                text: `${darkZone}\n*Irfan Ahmad*\n${darkZone}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Song Downloader",
                        body: "Completed Successfully",
                        thumbnail: thumbnail,
                        mediaType: 2,
                        mediaUrl: videoUrl,
                        sourceUrl: videoUrl
                    }
                }
            }, { quoted: mek });
        });

        audioStream.on('error', async (err) => {
            console.error(err);
            await reply(`❌ Audio processing failed: ${err.message}`);
        });

    } catch (error) {
        console.error(error);
        await reply(`❌ Error: ${error.message}`);
    }
});
