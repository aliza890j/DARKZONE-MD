const config = require('../config');
const { cmd } = require('../command');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const fetch = require('node-fetch');

// RapidAPI configurations
const API_CONFIGS = {
  YT_MEDIA_DOWNLOADER: {
    url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
    host: 'youtube-media-downloader.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
  },
  YT_STREAM: {
    url: 'https://ytstream-download-youtube-videos.p.rapidapi.com/dl',
    host: 'ytstream-download-youtube-videos.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
  },
  SOCIAL_MEDIA_DOWNLOADER: {
    url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/youtube',
    host: 'social-media-video-downloader.p.rapidapi.com',
    key: '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
  }
};

// Helper function to try multiple APIs
async function tryMultipleAPIs(videoId, type = 'video') {
  const attempts = [
    tryYtMediaDownloader(videoId, type),
    tryYtStream(videoId),
    trySocialMediaDownloader(videoId)
  ];
  
  for (const attempt of attempts) {
    try {
      const result = await attempt;
      if (result) return result;
    } catch (e) {
      console.log(`API attempt failed: ${e.message}`);
    }
  }
  throw new Error('All API attempts failed');
}

async function tryYtMediaDownloader(videoId, type) {
  const params = new URLSearchParams({
    videoId,
    urlAccess: 'normal',
    videos: type === 'video' ? 'auto' : 'none',
    audios: type === 'audio' ? 'auto' : 'none'
  });
  
  const response = await fetch(`${API_CONFIGS.YT_MEDIA_DOWNLOADER.url}?${params}`, {
    headers: {
      'x-rapidapi-host': API_CONFIGS.YT_MEDIA_DOWNLOADER.host,
      'x-rapidapi-key': API_CONFIGS.YT_MEDIA_DOWNLOADER.key
    }
  });
  
  const data = await response.json();
  
  if (type === 'video' && data.videos?.length) {
    const bestVideo = data.videos.reduce((prev, current) => 
      (prev.quality > current.quality) ? prev : current
    );
    return { url: bestVideo.url, type: 'video' };
  }
  
  if (type === 'audio' && data.audios?.length) {
    const bestAudio = data.audios.reduce((prev, current) => 
      (prev.bitrate > current.bitrate) ? prev : current
    );
    return { url: bestAudio.url, type: 'audio' };
  }
  
  return null;
}

async function tryYtStream(videoId) {
  const response = await fetch(`${API_CONFIGS.YT_STREAM.url}?id=${videoId}`, {
    headers: {
      'x-rapidapi-host': API_CONFIGS.YT_STREAM.host,
      'x-rapidapi-key': API_CONFIGS.YT_STREAM.key
    }
  });
  
  const data = await response.json();
  if (data.formats) {
    const bestFormat = data.formats.find(f => f.qualityLabel === '720p') || 
                      data.formats.find(f => f.qualityLabel === '480p') ||
                      data.formats[0];
    return { url: bestFormat.url, type: 'video' };
  }
  return null;
}

async function trySocialMediaDownloader(videoId) {
  const url = encodeURIComponent(`https://youtu.be/${videoId}`);
  const response = await fetch(`${API_CONFIGS.SOCIAL_MEDIA_DOWNLOADER.url}?url=${url}`, {
    headers: {
      'x-rapidapi-host': API_CONFIGS.SOCIAL_MEDIA_DOWNLOADER.host,
      'x-rapidapi-key': API_CONFIGS.SOCIAL_MEDIA_DOWNLOADER.key
    }
  });
  
  const data = await response.json();
  if (data.video) {
    return { url: data.video, type: 'video' };
  }
  return null;
}

// Extract video ID from URL or search query
async function getVideoInfo(query) {
  // If it's a URL, extract ID
  const urlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = query.match(urlRegex);
  
  if (match) {
    const videoId = match[1];
    const yt = await ytsearch(`https://youtu.be/${videoId}`);
    return yt.results[0];
  }
  
  // If it's a search query
  const yt = await ytsearch(query);
  if (yt.results.length < 1) throw new Error("No results found!");
  return yt.results[0];
}

// Video Download Command
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
        
        const yts = await getVideoInfo(q);
        const downloadInfo = await tryMultipleAPIs(yts.id, 'video');
        
        if (!downloadInfo || !downloadInfo.url) {
            return reply("Failed to fetch the video. Please try again later.");
        }

        let ytmsg = `📹 *Video Downloader*
🎬 *Title:* ${yts.title}
⏳ *Duration:* ${yts.timestamp}
👀 *Views:* ${yts.views}
👤 *Author:* ${yts.author.name}
🔗 *Link:* ${yts.url}
> 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟 ❤️`;

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
        console.log(e);
        reply("An error occurred: " + e.message);
    }
});

// Audio Download Command
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

        const song = await getVideoInfo(q);
        const downloadInfo = await tryMultipleAPIs(song.id, 'audio');
        
        if (!downloadInfo || !downloadInfo.url) {
            return reply("Failed to fetch the audio. Please try again later.");
        }

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
        console.error(error);
        reply("An error occurred: " + error.message);
    }
});
