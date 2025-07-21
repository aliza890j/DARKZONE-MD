const axios = require('axios');
const { cmd } = require('../command');
const fs = require('fs');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

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
            return reply("📽️ Please provide the name of the movie.\nExample: .movie The Shawshank Redemption");
        }

        // Step 1: Search for the movie
        const searchOptions = {
            method: 'GET',
            url: 'https://movie-tv-music-search-and-download.p.rapidapi.com/search',
            params: {
                query: movieName,
                type: 'movie'
            },
            headers: {
                'x-rapidapi-host': 'movie-tv-music-search-and-download.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        };

        const searchResponse = await axios.request(searchOptions);
        const searchResults = searchResponse.data;

        if (!searchResults || searchResults.length === 0) {
            return reply("🚫 No movies found with that name. Please try another title.");
        }

        // Get the first result
        const movie = searchResults[0];
        
        // Step 2: Get download links
        const downloadOptions = {
            method: 'GET',
            url: 'https://movie-tv-music-search-and-download.p.rapidapi.com/download',
            params: {
                imdb: movie.imdb_id,
                type: 'movie'
            },
            headers: {
                'x-rapidapi-host': 'movie-tv-music-search-and-download.p.rapidapi.com',
                'x-rapidapi-key': '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100'
            }
        };

        const downloadResponse = await axios.request(downloadOptions);
        const downloadLinks = downloadResponse.data;

        if (!downloadLinks || downloadLinks.length === 0) {
            return reply("⚠️ No download links available for this movie.");
        }

        // Find the best quality download link
        const bestQualityLink = downloadLinks.reduce((prev, current) => 
            (parseInt(current.quality.replace('p', '')) > parseInt(prev.quality.replace('p', ''))) ? current : prev
        );

        // Step 3: Download the movie
        reply("⬇️ Downloading movie... Please wait, this may take a while...");

        const tempFilePath = `./temp/${movie.imdb_id}_${bestQualityLink.quality}.mp4`;
        
        // Download the file
        const response = await axios({
            method: 'GET',
            url: bestQualityLink.url,
            responseType: 'stream'
        });

        await pipeline(
            response.data,
            fs.createWriteStream(tempFilePath)
        );

        // Step 4: Send to WhatsApp
        const fileSize = fs.statSync(tempFilePath).size;
        const maxSize = 100 * 1024 * 1024; // 100MB (WhatsApp limit)

        if (fileSize > maxSize) {
            fs.unlinkSync(tempFilePath);
            return reply("⚠️ The movie file is too large to send via WhatsApp. Please try a lower quality.");
        }

        const caption = `🎬 *${movie.title}* (${movie.year})\n\n` +
                       `⭐ IMDb: ${movie.rating || 'N/A'}\n` +
                       `📁 Quality: ${bestQualityLink.quality}\n` +
                       `📊 Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`;

        await conn.sendMessage(
            from,
            {
                document: { url: bestQualityLink.url },
                fileName: `${movie.title} (${movie.year}).mp4`,
                mimetype: 'video/mp4',
                caption: caption
            },
            { quoted: mek }
        );

        // Clean up
        fs.unlinkSync(tempFilePath);

    } catch (error) {
        console.error('Error in movie command:', error);
        reply(`❌ Error: ${error.message}`);
    }
});
