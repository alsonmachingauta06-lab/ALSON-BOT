const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function setProfilePicture(sock, chatId, msg) {
    try {
        const senderId =
            msg.key.participant ||
            msg.key.remoteJid;

        const owner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !owner) {
            await sock.sendMessage(chatId, {
                text: '❌ Only the owner can use .setpp!'
            }, { quoted: msg });
            return;
        }

        const context =
            msg.message?.extendedTextMessage?.contextInfo;

        const quoted = context?.quotedMessage;

        if (!quoted) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Reply to an image with .setpp'
            }, { quoted: msg });
            return;
        }

        const imageMessage = quoted.imageMessage;

        if (!imageMessage) {
            await sock.sendMessage(chatId, {
                text: '❌ The replied message must be an image.'
            }, { quoted: msg });
            return;
        }

        const stream = await downloadContentFromMessage(
            imageMessage,
            'image'
        );

        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        if (!buffer.length) {
            throw new Error('Downloaded image is empty');
        }

        // Update BOT profile picture directly from buffer
        await sock.updateProfilePicture(
            sock.user.id,
            buffer
        );

        await sock.sendMessage(chatId, {
            text: '✅ Bot profile picture updated successfully! 🤖'
        }, { quoted: msg });

        console.log('✅ Bot profile picture updated');

    } catch (error) {
        console.error('❌ setpp error:', error);

        try {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to update bot profile picture.\n\nMake sure you replied directly to a normal image.'
            }, { quoted: msg });
        } catch {}
    }
}

module.exports = setProfilePicture;
