const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

// YouTube Data API configuration
const YT_API_KEY = 'AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A';
const YT_API_URL = 'https://www.googleapis.com/youtube/v3';

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

cmd({
    pattern: "son",
    alias: ["music", "ytmusic"],
    react: "🎵",
    desc: "Download YouTube songs",
    category: "download",
    use: ".song <song name or YouTube URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoId = q.startsWith("http") ? extractVideoId(q) : null;
        let videoInfo = {};

        // Search if no video ID provided
        if (!videoId) {
            const searchResponse = await axios.get(`${YT_API_URL}/search`, {
                params: {
                    part: 'snippet',
                    q: q,
                    maxResults: 1,
                    type: 'video',
                    key: YT_API_KEY
                }
            });

            if (!searchResponse.data.items.length) {
                return await reply("❌ No results found for your search!");
            }

            videoId = searchResponse.data.items[0].id.videoId;
            videoInfo = {
                title: searchResponse.data.items[0].snippet.title,
                channel: searchResponse.data.items[0].snippet.channelTitle,
                thumbnail: searchResponse.data.items[0].snippet.thumbnails.high.url
            };
        }

        // Get video details
        const videoResponse = await axios.get(`${YT_API_URL}/videos`, {
            params: {
                part: 'snippet,contentDetails,statistics',
                id: videoId,
                key: YT_API_KEY
            }
        });

        if (!videoResponse.data.items.length) {
            return await reply("❌ Failed to fetch video details!");
        }

        const item = videoResponse.data.items[0];
        videoInfo = {
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high.url,
            duration: item.contentDetails.duration,
            views: parseInt(item.statistics.viewCount).toLocaleString(),
            publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString()
        };

        // Display video info
        const infoMsg = `🎵 *Song Downloader*\n\n` +
            `📌 *Title:* ${videoInfo.title}\n` +
            `⏳ *Duration:* ${videoInfo.duration.replace('PT', '').toLowerCase()}\n` +
            `👀 *Views:* ${videoInfo.views}\n` +
            `📅 *Published:* ${videoInfo.publishedAt}\n` +
            `👤 *Channel:* ${videoInfo.channel}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1. Audio (MP3) 🎧\n` +
            `2. Video (MP4) 🎬\n\n` +
            `${config.FOOTER || "𓆩JawadTechX𓆪"}`;

        const sentMsg = await conn.sendMessage(from, 
            { 
                image: { url: videoInfo.thumbnail }, 
                caption: infoMsg 
            }, 
            { quoted: mek }
        );

        // Store video ID for later use
        sentMsg.videoId = videoId;
        sentMsg.videoInfo = videoInfo;

        // Listen for user response
        const responseHandler = async (messageUpdate) => {
            try {
                const msg = messageUpdate.messages[0];
                if (!msg.message || !msg.message.extendedTextMessage) return;

                const isReply = msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;
                if (!isReply) return;

                const choice = msg.message.extendedTextMessage.text.trim();
                
                // Remove listener after first response
                conn.ev.off('messages.upsert', responseHandler);

                if (!['1', '2'].includes(choice)) {
                    return await reply("❌ Invalid choice! Please reply with 1 or 2.");
                }

                await reply("⏳ Downloading, please wait...");

                // Here you would typically use a service to convert YouTube to MP3/MP4
                // For example, you could use ytdl-core or an external API
                // This is just a placeholder implementation
                const downloadUrl = `https://example-yt-downloader.com/download?videoId=${videoId}&type=${choice === '1' ? 'mp3' : 'mp4'}`;

                if (choice === '1') {
                    await conn.sendMessage(from, 
                        { 
                            audio: { url: downloadUrl }, 
                            mimetype: 'audio/mpeg',
                            ptt: false 
                        },
                        { quoted: mek }
                    );
                } else {
                    await conn.sendMessage(from,
                        {
                            video: { url: downloadUrl },
                            caption: videoInfo.title,
                            mimetype: 'video/mp4'
                        },
                        { quoted: mek }
                    );
                }

                await reply("✅ Download complete!");

            } catch (error) {
                console.error(error);
                await reply(`❌ Error: ${error.message}`);
            }
        };

        // Set timeout for response
        setTimeout(() => {
            conn.ev.off('messages.upsert', responseHandler);
        }, 60000); // 1 minute timeout

        conn.ev.on('messages.upsert', responseHandler);

    } catch (error) {
        console.error(error);
        await reply(`❌ An error occurred: ${error.message}`);
    }
});
