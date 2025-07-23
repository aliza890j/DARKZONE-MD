/**
 * This code is for a WhatsApp bot that downloads audio from YouTube.
 * It uses the official Google API for searching and ytdl-core for downloading.
 *
 * Instructions:
 * 1. Make sure you have run 'npm install googleapis ytdl-core'.
 * 2. Place this code in your bot's command directory.
 * 3. The API Key is already included below.
 */

const { google } = require('googleapis');
const ytdl = require('ytdl-core');
const { cmd } = require('../command'); // Your command handler
const config = require('../config');   // Your config file

// --- YouTube API Configuration ---
const YOUTUBE_API_KEY = "AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A"; // Your provided API key
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY
});

cmd({
    pattern: "son",
    alias: ["play", "music", "ytaudio"],
    react: "🎵",
    desc: "Download and send audio from YouTube.",
    category: "download",
    use: ".song <song name or YouTube URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) {
            return await reply("❌ Please provide a song name or a valid YouTube URL!");
        }

        await reply("⏳ Searching and processing your request...");

        let videoId;
        let videoInfo;

        // Check if the input is a YouTube URL
        if (ytdl.validateURL(q)) {
            videoId = ytdl.getURLVideoID(q);
        } else {
            // If it's not a URL, search on YouTube using the API
            const searchResponse = await Youtube.list({
                part: 'snippet',
                q: q,
                type: 'video',
                maxResults: 1
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                return await reply("❌ Sorry, no song was found for your query.");
            }
            videoId = searchResponse.data.items[0].id.videoId;
        }

        if (!videoId) {
            return await reply("❌ Could not identify the video. Please try another search or URL.");
        }

        // Get detailed video information using ytdl-core
        videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
        const videoTitle = videoInfo.videoDetails.title;
        const videoUrl = videoInfo.videoDetails.video_url;
        const videoThumbnail = videoInfo.videoDetails.thumbnails[0].url;

        await reply(`✅ Found: *${videoTitle}*\n\n⏳ Preparing audio for download...`);

        // Choose the best audio-only format
        const audioFormat = ytdl.chooseFormat(videoInfo.formats, { filter: 'audioonly', quality: 'highestaudio' });

        if (!audioFormat) {
            return await reply("❌ No audio-only format could be found for this video.");
        }

        // Send the audio file to the user
        await conn.sendMessage(from, {
            audio: { url: audioFormat.url }, // Use the direct stream URL
            mimetype: 'audio/mpeg',
            ptt: false, // 'false' for music, 'true' for a voice note
            contextInfo: {
                externalAdReply: {
                    title: videoTitle,
                    body: "Powered by Irfan Ahmed",
                    thumbnail: { url: videoThumbnail },
                    mediaType: 1,
                    mediaUrl: videoUrl,
                    sourceUrl: videoUrl,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error("Error in YouTube Song Command:", error);
        await reply(`❌ An unexpected error occurred: ${error.message}`);
    }
});
