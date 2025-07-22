const config = require('../config');
const { cmd } = require('../command');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const fetch = require('node-fetch');

// Enhanced API configurations with timeouts
const API_CONFIGS = {
  YT_MEDIA_DOWNLOADER: {
    url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
    host: 'youtube-media-downloader.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100',
    timeout: 10000 // 10 seconds
  },
  YT_STREAM: {
    url: 'https://ytstream-download-youtube-videos.p.rapidapi.com/dl',
    host: 'ytstream-download-youtube-videos.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100',
    timeout: 10000
  },
  SOCIAL_MEDIA_DOWNLOADER: {
    url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/youtube',
    host: 'social-media-video-downloader.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100',
    timeout: 10000
  },
  // Adding a free fallback API
  YTDL_FALLBACK: {
    url: 'https://yt-downloader.cyclic.cloud/download',
    timeout: 15000
  }
};

// Helper function with better error handling
async function tryAPI(apiName, videoId, type) {
  const config = API_CONFIGS[apiName];
  let apiUrl;
  let options = { timeout: config.timeout };

  try {
    switch(apiName) {
      case 'YT_MEDIA_DOWNLOADER':
        const params = new URLSearchParams({
          videoId,
          urlAccess: 'normal',
          videos: type === 'video' ? 'auto' : 'none',
          audios: type === 'audio' ? 'auto' : 'none'
        });
        apiUrl = `${config.url}?${params}`;
        options.headers = {
          'x-rapidapi-host': config.host,
          'x-rapidapi-key': config.key
        };
        break;

      case 'YT_STREAM':
        apiUrl = `${config.url}?id=${videoId}`;
        options.headers = {
          'x-rapidapi-host': config.host,
          'x-rapidapi-key': config.key
        };
        break;

      case 'SOCIAL_MEDIA_DOWNLOADER':
        const url = encodeURIComponent(`https://youtu.be/${videoId}`);
        apiUrl = `${config.url}?url=${url}`;
        options.headers = {
          'x-rapidapi-host': config.host,
          'x-rapidapi-key': config.key
        };
        break;

      case 'YTDL_FALLBACK':
        apiUrl = `${config.url}?url=https://youtu.be/${videoId}&type=${type}`;
        break;
    }

    console.log(`Trying ${apiName} with URL: ${apiUrl}`);
    const response = await fetch(apiUrl, options);
    
    if (!response.ok) {
      throw new Error(`API ${apiName} responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`${apiName} response:`, JSON.stringify(data, null, 2));

    // Process response based on API
    switch(apiName) {
      case 'YT_MEDIA_DOWNLOADER':
        if (type === 'video' && data.videos?.length) {
          const bestVideo = data.videos.reduce((prev, current) => 
            (prev.quality > current.quality) ? prev : current
          );
          return { url: bestVideo.url, type: 'video', api: apiName };
        }
        if (type === 'audio' && data.audios?.length) {
          const bestAudio = data.audios.reduce((prev, current) => 
            (prev.bitrate > current.bitrate) ? prev : current
          );
          return { url: bestAudio.url, type: 'audio', api: apiName };
        }
        break;

      case 'YT_STREAM':
        if (data.formats) {
          const bestFormat = data.formats.find(f => f.qualityLabel === '720p') || 
                            data.formats.find(f => f.qualityLabel === '480p') ||
                            data.formats[0];
          return { url: bestFormat.url, type: 'video', api: apiName };
        }
        break;

      case 'SOCIAL_MEDIA_DOWNLOADER':
        if (data.video) {
          return { url: data.video, type: 'video', api: apiName };
        }
        break;

      case 'YTDL_FALLBACK':
        if (data.downloadUrl) {
          return { url: data.downloadUrl, type, api: apiName };
        }
        break;
    }

    throw new Error(`No valid ${type} found in ${apiName} response`);
  } catch (e) {
    console.error(`Error in ${apiName}:`, e.message);
    return null;
  }
}

// Enhanced multiple API trial with logging
async function tryMultipleAPIs(videoId, type = 'video') {
  const apiOrder = [
    'YT_MEDIA_DOWNLOADER',
    'YT_STREAM',
    'SOCIAL_MEDIA_DOWNLOADER',
    'YTDL_FALLBACK' // Last resort
  ];

  for (const apiName of apiOrder) {
    console.log(`Attempting ${apiName} for ${videoId} (${type})`);
    const result = await tryAPI(apiName, videoId, type);
    if (result) {
      console.log(`Success with ${apiName}: ${result.url}`);
      return result;
    }
  }

  throw new Error(`All APIs failed for ${videoId}. Check console for details.`);
}

// Extract video ID from URL or search query with better validation
async function getVideoInfo(query) {
  try {
    // If it's a URL, extract ID
    const urlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/([^"&?\/\s]{11})/i;
    const match = query.match(urlRegex);
    
    if (match && match[1]) {
      const videoId = match[1];
      const yt = await ytsearch(`https://youtu.be/${videoId}`);
      if (!yt.results.length) throw new Error("No results found for this URL");
      return yt.results[0];
    }
    
    // If it's a search query
    const yt = await ytsearch(query);
    if (!yt.results.length) throw new Error("No results found for your search");
    return yt.results[0];
  } catch (e) {
    console.error('Error in getVideoInfo:', e);
    throw new Error("Couldn't get video information. Please try a different query.");
  }
}

// Enhanced video download command with better user feedback
cmd({ 
    pattern: "mp4", 
    alias: ["video4"], 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "main", 
    use: '.mp4 < Yt url or Name >', 
    filename: __filename 
}, async (conn, mek, m, { from, prefix, quoted, q, reply }) => { 
    try { 
        if (!q) return await reply("Please provide a YouTube URL or video name.");
        
        await reply("🔍 Searching for video...");
        const yts = await getVideoInfo(q);
        
        await reply("⬇️ Downloading video... This may take a moment...");
        const downloadInfo = await tryMultipleAPIs(yts.id, 'video');
        
        if (!downloadInfo || !downloadInfo.url) {
            return reply("❌ Failed to download video. All APIs returned no data.");
        }

        let ytmsg = `📹 *Video Downloader* (via ${downloadInfo.api})
🎬 *Title:* ${yts.title}
⏳ *Duration:* ${yts.timestamp}
👀 *Views:* ${yts.views}
👤 *Author:* ${yts.author.name}
🔗 *Link:* ${yts.url}
> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 ❤️`;

        await reply("📤 Sending video...");
        await conn.sendMessage(
            from, 
            { 
                video: { url: downloadInfo.url }, 
                caption: ytmsg,
                mimetype: "video/mp4"
            }, 
            { quoted: mek }
        );

    } catch (e) {
        console.error('Video download error:', e);
        reply(`❌ Error: ${e.message}\n\nPlease try again later or with a different video.`);
    }
});

// Enhanced audio download command with better user feedback
cmd({ 
    pattern: "song4", 
    alias: ["play", "mp3"], 
    react: "🎶", 
    desc: "Download YouTube song", 
    category: "main", 
    use: '.song <query>', 
    filename: __filename 
}, async (conn, mek, m, { from, sender, reply, q }) => { 
    try {
        if (!q) return reply("Please provide a song name or YouTube link.");

        await reply("🔍 Searching for song...");
        const song = await getVideoInfo(q);
        
        await reply("⬇️ Downloading audio... This may take a moment...");
        const downloadInfo = await tryMultipleAPIs(song.id, 'audio');
        
        if (!downloadInfo || !downloadInfo.url) {
            return reply("❌ Failed to download audio. All APIs returned no data.");
        }

        await reply("📤 Sending audio...");
        await conn.sendMessage(from, {
            audio: { url: downloadInfo.url },
            mimetype: "audio/mpeg",
            fileName: `${song.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: song.title.length > 25 ? `${song.title.substring(0, 22)}...` : song.title,
                    body: "Join our WhatsApp Channel",
                    mediaType: 1,
                    thumbnailUrl: song.thumbnail.replace('default.jpg', 'hqdefault.jpg'),
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J',
                    mediaUrl: 'https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J',
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('Audio download error:', error);
        reply(`❌ Error: ${error.message}\n\nPlease try again later or with a different song.`);
    }
});
