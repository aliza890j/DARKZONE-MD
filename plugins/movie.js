const axios = require('axios');
const { cmd } = require('../command');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

cmd({
    pattern: "movie",
    desc: "Get and send movie directly",
    category: "utility",
    react: "🎬"
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const query = args.join(' ');
        if (!query) return reply('🎥 Movie name?');

        // Step 1: Search movie
        const searchOpts = {
            method: 'GET',
            url: 'https://movie-database-api1.p.rapidapi.com/list_movies.json',
            params: { query_term: query, limit: 1 },
            headers: {
                'x-rapidapi-host': 'movie-database-api1.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        };

        const searchRes = await axios(searchOpts);
        if (!searchRes.data.data.movie_count) return reply('❌ Movie not found');

        const movie = searchRes.data.data.movies[0];
        
        // Step 2: Get best quality MP4 link
        const bestMP4 = movie.torrents.find(t => t.url.endsWith('.mp4')) || 
                       movie.torrents[0];
        
        if (!bestMP4) return reply('⚠️ No downloadable version available');

        // Step 3: Download and send
        reply('⬇️ Downloading... Please wait');
        
        const videoRes = await axios({
            method: 'GET',
            url: bestMP4.url,
            responseType: 'arraybuffer'
        });

        const tempPath = `./temp/${movie.id}.mp4`;
        await writeFileAsync(tempPath, videoRes.data);

        await conn.sendMessage(
            from,
            { 
                video: fs.readFileSync(tempPath),
                caption: `🎬 ${movie.title} (${movie.year})\nQuality: ${bestMP4.quality}`
            },
            { quoted: mek }
        );

        fs.unlinkSync(tempPath); // Clean up

    } catch (error) {
        console.error(error);
        reply(`❌ Error: ${error.message}`);
    }
});
