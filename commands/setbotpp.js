const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function setBotPP(sock, chatId, message) {
    try {
        // Owner only verification
        const senderId = message.key.participant || message.key.remoteJid;
        const owner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !owner) {
            await sock.sendMessage(
                chatId,
                { text: '❌ Only the owner can change the menu picture.' },
                { quoted: message }
            );
            return;
        }

        // Get the quoted or attached message image context block
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetImage = message.message?.imageMessage || quotedMessage?.imageMessage;

        if (!targetImage) {
            await sock.sendMessage(
                chatId,
                { text: '❌ Please reply to an image with `.setbotpp` to update the menu background.' },
                { quoted: message }
            );
            return;
        }

        await sock.sendMessage(chatId, { text: '⏳ *Updating menu background image...*' }, { quoted: message });

        // Download raw decrypted streams from WhatsApp infrastructure
        const stream = await downloadContentFromMessage(targetImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Target target asset configuration matching your help system path parameters
        const savePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        // Ensure destination folder structure architecture exists
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Overwrite existing menu background asset template image cleanly
        fs.writeFileSync(savePath, buffer);

        await sock.sendMessage(
            chatId,
            { text: '✅ *Menu image modified successfully!* Type `.menu` or `.help` to view your new theme.' },
            { quoted: message }
        );

    } catch (error) {
        console.error('❌ setbotpp operational module failure:', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ An error occurred while rewriting your menu background asset image file layout.' },
            { quoted: message }
        );
    }
}

module.exports = setBotPP;
