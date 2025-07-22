const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');


module.exports = {
  name: 'song4',
  alias: ['downloadmusic', 'music', 'ytmp3', 'song'],
  category: 'media',
  desc: 'Download music from YouTube by title',
  async exec(m, { text, args, command }) {
    if (!text) return m.reply('Please provide a song name. Example: .song Despacito');

    try {
      m.reply('🔎 Searching for the song...');

      const apiKey = process.env.YT_API_KEY || 'AIzaSyDrGpiGkRu71pXUe1xnWdFWe3GEaxtWV_A'; // Replace or use env
      const query = encodeURIComponent(text);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&key=${apiKey}&type=video&maxResults=1`;

      const res = await fetch(url);
      const data = await res.json();
      if (!data.items || !data.items.length) return m.reply('❌ No results found.');

      const videoId = data.items[0].id.videoId;
      const title = data.items[0].snippet.title;
      const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

      // Now get MP3 using a custom y2mate scraper or API
      const result = await ytmp3(ytLink); // This should return { dl_link, title, filesize }

      let msg = `🎵 *Title:* ${result.title}\n📦 *Size:* ${result.filesize}\n🔗 *Link:* ${result.dl_link}`;
      await m.reply(msg);

      await m.reply('⏬ Sending audio...');
      await m.sendFile(result.dl_link, `${result.title}.mp3`, null, m);

    } catch (err) {
      console.error(err);
      m.reply('⚠️ Error fetching song. Try again later.');
    }
  }
};
