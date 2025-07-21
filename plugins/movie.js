const axios = require('axios');
const { cmd } = require('../command');

cmd({
    pattern: "movie",
    desc: "Search and download movies",
    category: "utility",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, reply, sender, args }) => {
    try {
        const movieName = args.length > 0 ? args.join(' ') : m.text.replace(/^[\.\#\$\!]?movie\s?/i, '').trim();
        
        if (!movieName) {
            return reply("🎥 Please provide a movie name.\nExample: .movie Avengers");
        }

        const options = {
            method: 'GET',
            url: 'https://movie-database-api1.p.rapidapi.com/list_movies.json',
            params: {
                query_term: movieName,
                limit: 1,
                sort_by: 'download_count'
            },
            headers: {
                'x-rapidapi-host': 'movie-database-api1.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        };

        const response = await axios.request(options);
        const data = response.data;
        
        if (!data.data || data.data.movie_count === 0) {
            return reply("❌ Movie not found. Please try another name.");
        }

        const movie = data.data.movies[0];
        const torrents = movie.torrents || [];
        
        // Filter for best quality available
        const bestQuality = torrents.reduce((best, current) => {
            if (!best) return current;
            return (current.quality === '1080p' || 
                   (current.quality === '720p' && best.quality !== '1080p')) ? current : best;
        }, null);

        let downloadLinks = '';
        if (bestQuality) {
            downloadLinks = `\n\n📥 *Download Links:*\n🔹 ${bestQuality.quality}: ${bestQuality.url}`;
        } else {
            downloadLinks = '\n\n⚠️ No download links available for this movie';
        }

        const caption = `
🎬 *${movie.title}* (${movie.year})
⭐ Rating: ${movie.rating}/10 | 🕒 Runtime: ${movie.runtime} mins
🎭 Genre: ${movie.genres.join(', ')}

📝 *Synopsis:* ${movie.synopsis || 'Not available'}

${downloadLinks}

🔍 *IMDb:* https://www.imdb.com/title/${movie.imdb_code}/
`;

        await conn.sendMessage(
            from,
            {
                image: { url: movie.medium_cover_image },
                caption: caption,
                contextInfo: {
                    mentionedJid: [sender]
                }
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('Movie error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});
