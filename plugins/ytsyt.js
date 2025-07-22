const config = require('../config');
const { cmd } = require('../command');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const fetch = require('node-fetch');
const axios = require('axios');

// API configurations with fallback options
const API_CONFIGS = {
  PRIMARY: {
    name: "YouTube Media Downloader",
    url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
    host: 'youtube-media-downloader.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100',
    timeout: 8000
  },
  SECONDARY: {
    name: "YT Stream",
    url: 'https://ytstream-download-youtube-videos.p.rapidapi.com/dl',
    host: 'ytstream-download-youtube-videos.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100',
    timeout: 8000
  },
  FALLBACK: {
    name: "Free YouTube Downloader",
    url: 'https://yt-api-henna.vercel.app/download',
    timeout: 15000
  }
};

// Improved API try function
async function tryDownloadAPI(videoId, type) {
  const attempts = [
    attemptPrimaryAPI(videoId, type),
    attemptSecondaryAPI(videoId, type),
    attemptFallbackAPI(videoId, type)
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt;
      if (result && result.url) {
        return result;
      }
    } catch (e) {
      console.error('API attempt failed:', e.message);
    }
  }
  throw new Error("All download attempts failed");
}

async function attemptPrimaryAPI(videoId, type) {
  try {
    const options = {
      method: 'GET',
      url: API_CONFIGS.PRIMARY.url,
      params: {
        videoId: videoId,
        urlAccess: 'normal',
        videos: type === 'video' ? 'auto' : 'none',
        audios: type === 'audio' ? 'auto' : 'none'
      },
      headers: {
        'x-rapidapi-host': API_CONFIGS.PRIMARY.host,
        'x-rapidapi-key': API_CONFIGS.PRIMARY.key
      },
      timeout: API_CONFIGS.PRIMARY.timeout
    };

    const response = await axios.request(options);
    const data = response.data;

    if (type === 'video' && data.videos?.length) {
      const bestVideo = data.videos.sort((a, b) => b.quality - a.quality)[0];
      return { 
        url: bestVideo.url, 
        api: API_CONFIGS.PRIMARY.name,
        quality: bestVideo.qualityLabel || 'HD'
      };
    }

    if (type === 'audio' && data.audios?.length) {
      const bestAudio = data.audios.sort((a, b) => b.bitrate - a.bitrate)[0];
      return { 
        url: bestAudio.url, 
        api: API_CONFIGS.PRIMARY.name,
        quality: 'Audio'
      };
    }
  } catch (e) {
    console.error('Primary API error:', e.message);
    return null;
  }
}

async function attemptSecondaryAPI(videoId, type) {
  try {
    const options = {
      method: 'GET',
      url: API_CONFIGS.SECONDARY.url,
      params: { id: videoId },
      headers: {
        'x-rapidapi-host': API_CONFIGS.SECONDARY.host,
        'x-rapidapi-key': API_CONFIGS.SECONDARY.key
      },
      timeout: API_CONFIGS.SECONDARY.timeout
    };

    const response = await axios.request(options);
    const data = response.data;

    if (data.formats) {
      const bestFormat = type === 'video' 
        ? data.formats.find(f => f.qualityLabel === '720p') || 
          data.formats.find(f => f.qualityLabel === '480p') ||
          data.formats[0]
        : data.formats.find(f => f.hasAudio && !f.hasVideo);
      
      if (bestFormat) {
        return {
          url: bestFormat.url,
          api: API_CONFIGS.SECONDARY.name,
          quality: bestFormat.qualityLabel || 'Standard'
        };
      }
    }
  } catch (e) {
    console.error('Secondary API error:', e.message);
    return null;
  }
}

async function attemptFallbackAPI(videoId, type) {
  try {
    const response = await axios.get(`${API_CONFIGS.FALLBACK.url}?id=${videoId}&type=${type}`, {
      timeout: API_CONFIGS.FALLBACK.timeout
    });
    
    if (response.data?.url) {
      return {
        url: response.data.url,
        api: API_CONFIGS.FALLBACK.name,
        quality: type === 'video' ? 'HD' : 'Audio'
      };
    }
  } catch (e) {
    console.error('Fallback API error:', e.message);
    return null;
  }
}

// Improved video info extraction
async function getVideoDetails(query) {
  try {
    // Extract video ID if URL is provided
    const urlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/([^"&?\/\s]{11})/i;
    const match = query.match(urlRegex);
    
    let videoInfo;
    if (match && match[1]) {
      // If it's a URL
      const videoId = match[1];
      const search = await ytsearch(`https://youtu.be/${videoId}`);
      videoInfo = search.results[0];
    } else {
      // If it's a search query
      const search = await ytsearch(query);
      videoInfo = search.results[0];
    }

    if (!videoInfo) {
      throw new Error("No video found for your query");
    }

    return {
      id: videoInfo.id || extractIdFromUrl(videoInfo.url),
      title: videoInfo.title,
      duration: videoInfo.timestamp,
      views: videoInfo.views,
      author: videoInfo.author?.name || "Unknown",
      url: videoInfo.url,
      thumbnail: videoInfo.thumbnail?.replace('default.jpg', 'hqdefault.jpg')
    };
  } catch (e) {
    console.error('Video details error:', e);
    throw new Error("Couldn't get video information. Please try a different query.");
  }
}

function extractIdFromUrl(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Video Download Command
cmd({ 
    pattern: "mp4", 
    alias: ["video", "vid"], 
    react: "🎥", 
    desc: "Download YouTube video", 
    category: "main", 
    use: '.mp4 <YouTube URL or search term>', 
    filename: __filename 
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply("Please provide a YouTube URL or video name.");

        // Step 1: Get video info
        await reply("🔍 Searching for video details...");
        const video = await getVideoDetails(q);
        
        // Step 2: Download video
        await reply("⬇️ Downloading video (this may take a moment)...");
        const download = await tryDownloadAPI(video.id, 'video');
        
        if (!download) {
            return reply("❌ Failed to download video. Please try again later.");
        }

        // Step 3: Prepare message
        const caption = `📹 *${video.title}* (${download.quality})
⏳ Duration: ${video.duration}
👀 Views: ${video.views}
👤 Author: ${video.author}
🔗 URL: ${video.url}
📥 Downloaded via ${download.api}`;

        // Step 4: Send video
        await reply("📤 Sending video...");
        await conn.sendMessage(from, {
            video: { url: download.url },
            caption: caption,
            mimetype: "video/mp4"
        }, { quoted: mek });

    } catch (error) {
        console.error('Video command error:', error);
        reply(`❌ Error: ${error.message}\nPlease try again with a different video.`);
    }
});

// Audio Download Command
cmd({ 
    pattern: "song4", 
    alias: ["music", "mp3"], 
    react: "🎵", 
    desc: "Download YouTube audio", 
    category: "main", 
    use: '.song <YouTube URL or search term>', 
    filename: __filename 
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply("Please provide a song name or YouTube link.");

        // Step 1: Get video info
        await reply("🔍 Searching for song details...");
        const video = await getVideoDetails(q);
        
        // Step 2: Download audio
        await reply("⬇️ Downloading audio (this may take a moment)...");
        const download = await tryDownloadAPI(video.id, 'audio');
        
        if (!download) {
            return reply("❌ Failed to download audio. Please try again later.");
        }

        // Step 3: Prepare message
        const caption = `🎵 *${video.title}*
⏳ Duration: ${video.duration}
👤 Artist: ${video.author}
🔗 URL: ${video.url}
📥 Downloaded via ${download.api}`;

        // Step 4: Send audio
        await reply("📤 Sending audio...");
        await conn.sendMessage(from, {
            audio: { url: download.url },
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: video.title.length > 30 ? `${video.title.substring(0, 27)}...` : video.title,
                    body: "Enjoy the music!",
                    mediaType: 1,
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: video.url,
                    showAdAttribution: true
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('Song command error:', error);
        reply(`❌ Error: ${error.message}\nPlease try again with a different song.`);
    }
});
