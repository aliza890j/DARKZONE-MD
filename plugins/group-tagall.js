cmd({
    pattern: "tagall",
    react: "🔊",
    alias: ["gc_tagall"],
    desc: "To Tag all Members",
    category: "group",
    use: '.tagall [message]',
    filename: __filename
},
async (conn, mek, m, { from, participants, reply, isGroup, senderNumber, groupAdmins, prefix, command, args, body }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        
        // Better bot owner check
        const botOwner = config.OWNER_NUMBER + "@s.whatsapp.net"; // Use from config
        const senderJid = senderNumber + "@s.whatsapp.net";

        if (!groupAdmins.includes(senderJid) && senderJid !== botOwner) {
            return reply("❌ Only group admins or the bot owner can use this command.");
        }

        // Get fresh group metadata
        const groupInfo = await conn.groupMetadata(from);
        const groupName = groupInfo.subject || "Unknown Group";
        const members = groupInfo.participants || participants;
        
        if (!members || members.length === 0) {
            return reply("❌ No members found in this group.");
        }

        const emojis = ['📢', '🔊', '🌐', '🔰', '❤‍🩹', '🤍', '🖤', '🩵', '📝', '💗', '🔖', '🪩', '📦', '🎉', '🛡️', '💸', '⏳', '🗿', '🚀', '🎧', '🪀', '⚡', '🚩', '🍁', '🗣️', '👻', '⚠️', '🔥'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        // Get message after command
        const message = body.replace(prefix + command, "").trim() || "Attention Everyone";

        let teks = `▢ Group : *${groupName}*\n▢ Members : *${members.length}*\n▢ Message: *${message}*\n\n┌───⊷ *MENTIONS*\n`;

        // Build mention list
        members.forEach(mem => {
            teks += `${randomEmoji} @${mem.id.split('@')[0]}\n`;
        });

        teks += "└──✪ DARKZONE ┃ MD ✪──";

        // Send with proper mentions
        await conn.sendMessage(
            from, 
            { 
                text: teks, 
                mentions: members.map(a => a.id) 
            }, 
            { quoted: mek }
        );

    } catch (e) {
        console.error("TagAll Error:", e);
        reply(`❌ *Error Occurred!*\n\n${e.message || "Unknown error"}`);
    }
});
