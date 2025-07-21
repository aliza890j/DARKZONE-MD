const axios = require('axios');
const { cmd } = require('../command');

cmd({
    pattern: "movie",
    desc: "Get full movies",
    category: "utility",
    react: "🎬"
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const query = args.join(' ');
        if (!query) return reply('🎥 Please provide movie name\nExample: .movie Titanic');

        reply('🔍 Finding full movie links...');
        
        // Using a more reliable API (replace with your actual API)
        const apiUrl = `https://movies-api.example.com/search?query=${encodeURIComponent(query)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'Bearer your_api_key_here'
            }
        });

        if (!response.data.results.length) {
            return reply('❌ No full movie found. Try another name or check spelling.');
        }

        const movie = response.data.results[0];
        
        // Send download options
        const message = `
🎬 *${movie.title}* (${movie.year})
🕒 ${movie.duration} | 🌟 ${movie.rating}/10

📥 Download Options:
1. HD Quality (${movie.hd_size})
2. SD Quality (${movie.sd_size})

Reply with *1* or *2* to download
        `;

        await conn.sendMessage(from, { text: message }, { quoted: mek });

    } catch (error) {
        console.error('Movie error:', error);
        reply(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
});
