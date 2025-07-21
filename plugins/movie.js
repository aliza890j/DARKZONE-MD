const axios = require('axios');
const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// Config
const API_KEY = '8f8214432dmshe2d6730ba6b5541p119a35jsna12406472100';
const TEMP_DIR = './temp_movies';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

cmd({
    pattern: "movie",
    desc: "Download movies via IMDb",
    category: "entertainment",
    react: "🎥",
    filename: __filename
},
async (Void, citel, text, { from }) => {
    try {
        if (!text) return citel.reply("🔍 Please provide a movie name!\nExample: .movie Inception");

        // Step 1: Search Movie
        const searchUrl = 'https://imdb236.p.rapidapi.com/api/imdb/search';
        const searchParams = {
            query: text,
            type: 'movie',
            rows: 5
        };

        const searchResponse = await axios.get(searchUrl, {
            params: searchParams,
            headers: {
                'x-rapidapi-host': 'imdb236.p.rapidapi.com',
                'x-rapidapi-key': API_KEY
            },
            timeout: 10000
        });

        const movies = searchResponse.data?.docs;
        if (!movies?.length) return citel.reply("❌ No movies found!");

        // Get best match (first result)
        const movie = movies[0];
        
        // Step 2: Get Download Links (using external provider)
        const downloadLinks = await getDownloadLinks(movie.title, movie.year);
        if (!downloadLinks?.length) return citel.reply("⚠️ No download links available!");

        // Step 3: Download and Send
        await sendMovieFile(Void, citel, movie, downloadLinks[0]);

    } catch (error) {
        console.error("Movie Error:", error);
        citel.reply(`❌ Error: ${error.response?.status === 429 ? 
                    "API limit reached! Try later." : 
                    "Failed to process movie."}`);
    }
});

// Helper: Get download links from external source
async function getDownloadLinks(title, year) {
    try {
        // Replace this with actual download source API
        // This is just a placeholder structure
        return [{
            url: `https://example-movies.com/dl/${encodeURIComponent(title)}_${year}.mp4`,
            quality: "720p",
            size: "850MB"
        }];
    } catch (err) {
        return null;
    }
}

// Helper: Download and send movie
async function sendMovieFile(Void, citel, movie, downloadLink) {
    try {
        await citel.reply("⬇️ Downloading movie... Please wait...");

        const tempFile = path.join(TEMP_DIR, `${movie.id}.mp4`);
        
        // Download file
        const response = await axios({
            url: downloadLink.url,
            method: 'GET',
            responseType: 'stream',
            timeout: 60000
        });

        await pipeline(response.data, fs.createWriteStream(tempFile));
        
        // Check file size
        const stats = fs.statSync(tempFile);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > 100) {
            fs.unlinkSync(tempFile);
            return citel.reply("⚠️ File too large for WhatsApp (max 100MB)");
        }

        // Send as document
        await Void.sendMessage(citel.chat, {
            document: fs.readFileSync(tempFile),
            fileName: `${movie.title} (${movie.year}).mp4`,
            mimetype: 'video/mp4',
            caption: `🎬 *${movie.title}* (${movie.year})\n📁 Quality: ${downloadLink.quality}\n📊 Size: ${fileSizeMB.toFixed(2)}MB`
        }, { quoted: citel });

        // Cleanup
        fs.unlinkSync(tempFile);

    } catch (err) {
        console.error("Download Error:", err);
        citel.reply("❌ Failed to send movie file");
    }
}
