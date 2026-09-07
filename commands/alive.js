 const settings = require("../settings");
async function aliveCommand(sock, chatId, message) {
    try {
        const message1 = `*🤖 Alson XMD is Active! 🤖*\n\n` +
                       `*Version:* ${settings.version}\n` +
                       `*Status:* Online\n\n` +
                       `*🌟 MENUS:*\n` +
                       `• General Menu\n` +
                       `• Group Menu\n` +
                       `• Owner Menu\n` +
                       `• Sticker Menu\n` +
                       `• Pies Menu\n` +
                       `• Game Menu\n` +   
                       `• Ai Menu\n` +  
                       `• Fun Menu\n` +
                       `• Ephoto Menu\n` +
                       `• Download Menu\n` +
                       `• Misc Menu\n` +
                       `• Anime Menu\n` +
                       `• Github Menu\n` +            
                       `• And Many more!\n\n` +
                       `Type *.menu* for full command list\n\n`+
                       `*Copyright AlsonMachingauta 2025*`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363411442434414@newsletter',
                    newsletterName: 'Alson XMD BOTS',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: 'Bot is alive and running!' }, { quoted: message });
    }
}

module.exports = aliveCommand;
