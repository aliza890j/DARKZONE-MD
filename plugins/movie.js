const axios = require('axios');

cmd({
    pattern: "movie",
    alias: ["dmovie", "getmovie"],
    desc: "Search and download movies via torrent",
    category: "utility",
    use: '<movie name>',
    filename: __filename
}, async (conn, mek, m, { from, prefix, command, args }) => {
    try {
        if (!args[0]) return conn.sendMessage(from, { text: `Please provide a movie name.\nExample: *${prefix}${command} Avengers Endgame*` }, { quoted: mek });

        const searchQuery = args.join(' ');
        
        // Make API request to RapidAPI
        const options = {
            method: 'GET',
            url: 'https://movie-database-api1.p.rapidapi.com/list_movies.json',
            params: {
                query_term: searchQuery,
                limit: 1, // Get only the most relevant result
                sort_by: 'download_count', // Sort by most downloaded
                order_by: 'desc'
            },
            headers: {
                'x-rapidapi-host': 'movie-database-api1.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100' // Your RapidAPI key
            }
        };

        const response = await axios.request(options);
        const data = response.data;
        
        if (!data.data || !data.data.movies || data.data.movies.length === 0) {
            return conn.sendMessage(from, { text: `No movie found for *${searchQuery}*` }, { quoted: mek });
        }

        const movie = data.data.movies[0];
        let message = `🎬 *${movie.title}* (${movie.year})\n⭐ Rating: ${movie.rating}/10\n\n`;

        if (movie.torrents && movie.torrents.length > 0) {
            message += `📥 *Download Links:*\n\n`;
            
            // Group torrents by quality and get the best of each
            const qualityMap = {};
            movie.torrents.forEach(torrent => {
                if (!qualityMap[torrent.quality] || 
                    (torrent.type === 'bluray' && qualityMap[torrent.quality].type !== 'bluray')) {
                    qualityMap[torrent.quality] = torrent;
                }
            });

            // Add download links for each quality
            Object.entries(qualityMap).forEach(([quality, torrent]) => {
                message += `🔹 ${quality}: ${torrent.url}\n`;
            });
            
            message += `\n📌 *Note:* Copy the link and open in browser to download`;
        } else {
            message += `⚠️ No download links available for this movie.`;
        }

        // Send movie info with download links
        await conn.sendMessage(from, { text: message }, { quoted: mek });

    } catch (error) {
        console.error('Error in downloadmovie command:', error);
        let errorMessage = '❌ An error occurred while fetching movie data.';
        if (error.response) {
            errorMessage += `\nStatus: ${error.response.status}`;
            if (error.response.status === 429) {
                errorMessage += '\nAPI rate limit exceeded. Please try again later.';
            }
        }
        await conn.sendMessage(from, { text: errorMessage }, { quoted: mek });
    }
});
