const axios = require('axios');
const { cmd } = require('../command');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

cmd({
    pattern: "movie",
    desc: "Get full-length movies",
    category: "utility",
    react: "🎬"
}, async (conn, mek, m, { from, reply, args, sender }) => {
    try {
        const query = args.join(' ');
        if (!query) return reply('🎥 Please provide movie name\nExample: .movie Avengers');

        // Step 1: Search movie
        const searchOpts = {
            method: 'GET',
            url: 'https://movie-database-api1.p.rapidapi.com/list_movies.json',
            params: { 
                query_term: query, 
                limit: 1,
                sort_by: 'download_count',
                minimum_rating: 5
            },
            headers: {
                'x-rapidapi-host': 'movie-database-api1.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        };

        reply('🔍 Searching for full movie...');
        const searchRes = await axios(searchOpts);
        
        if (!searchRes.data.data || searchRes.data.data.movie_count === 0) {
            return reply('❌ Full movie not found. Try another name.');
        }

        const movie = searchRes.data.data.movies[0];
        
        // Send format selection menu
        const menuMsg = await conn.sendMessage(
            from,
            {
                text: `🎬 *${movie.title}* (${movie.year})\n\nSelect format:\n1. Send as Document (Better quality)\n2. Send as Video (Faster)\n\nReply with *1* or *2*`,
                contextInfo: {
                    mentionedJid: [sender]
                }
            },
            { quoted: mek }
        );

        // Wait for user's format selection
        const formatSelection = await conn.waitForMessage(
            from, 
            (msg) => ['1', '2'].includes(msg.text.trim()),
            { 
                time: 30000, // 30 seconds timeout
                quoted: menuMsg
            }
        ).catch(() => null);

        if (!formatSelection) return reply('⌛ Timeout. Please try again.');

        const sendAsDocument = formatSelection.text.trim() === '1';
        
        // Get the largest available torrent file
        const bestTorrent = movie.torrents.reduce((best, current) => {
            return (!best || current.size > best.size) ? current : best;
        });

        if (!bestTorrent) return reply('⚠️ No downloadable version available');

        reply('⬇️ Downloading full movie... This may take several minutes');
        
        // Download the torrent/magnet file
        const tempPath = `./temp/${movie.id}_${Date.now()}.torrent`;
        await writeFileAsync(tempPath, bestTorrent.url);

        // For actual implementation, you would need:
        // 1. A torrent client integration
        // 2. A server to host the downloaded file
        // 3. Proper error handling for large files

        // This is simplified version - in reality you need server-side processing
        if (sendAsDocument) {
            await conn.sendMessage(
                from,
                {
                    document: { url: bestTorrent.url },
                    fileName: `${movie.title} (${movie.year}).torrent`,
                    mimetype: 'application/x-bittorrent',
                    caption: `🎬 ${movie.title}\nQuality: ${bestTorrent.quality}\nSize: ${Math.round(bestTorrent.size/1024/1024)}MB`
                },
                { quoted: mek }
            );
        } else {
            await conn.sendMessage(
                from,
                {
                    video: { url: bestTorrent.url },
                    caption: `🎬 ${movie.title} (${movie.year})\nQuality: ${bestTorrent.quality}`
                },
                { quoted: mek }
            );
        }

        fs.unlinkSync(tempPath);

    } catch (error) {
        console.error('Movie error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});
