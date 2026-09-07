const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function setBotPP(sock, chatId, message) {
    try {
        // Owner only validation
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

        // Get quoted message containing the image
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetImage = message.message?.imageMessage || quotedMessage?.imageMessage;

        if (!targetImage) {
            await sock.sendMessage(
                chatId,
                { text: '❌ Please reply to an image with `.setbotpp` to set the menu background.' },
                { quoted: message }
            );
            return;
        }

        // Send a temporary downloading alert
        await sock.sendMessage(chatId, { text: '⏳ *Downloading image... please wait.*' }, { quoted: message });

        // Download the media stream directly from WhatsApp servers
        const stream = await downloadContentFromMessage(targetImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Save the image locally in your bot root folder
        const savePath = path.join(__dirname, '../menu_banner.jpg');
        fs.writeFileSync(savePath, buffer);

        await sock.sendMessage(
            chatId,
            { text: '✅ *Menu image updated successfully!* Type `.menu` to test it.' },
            { quoted: message }
        );

    } catch (error) {
        console.error('❌ setbotpp error:', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ An error occurred while saving the menu picture.' },
            { quoted: message }
        );
    }
}

module.exports = setBotPP;
