const isOwnerOrSudo = require('../lib/isOwner');

async function toGroupStatus(sock, chatId, message) {
    try {
        // Only groups
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(
                chatId,
                { text: '❌ This command can only be used inside a group.' },
                { quoted: message }
            );
            return;
        }

        // Owner only
        const senderId = message.key.participant || message.key.remoteJid;
        const owner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !owner) {
            await sock.sendMessage(
                chatId,
                { text: '❌ Only the owner can use .togroupstatus' },
                { quoted: message }
            );
            return;
        }

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const args = text.trim().split(/\s+/);
        args.shift();

        const statusText = args.join(' ').trim();

        if (!statusText) {
            await sock.sendMessage(
                chatId,
                {
                    text:
                        '📱 *TO GROUP STATUS*\n\n' +
                        'Usage:\n' +
                        '.togroupstatus Your status here\n\n' +
                        'Example:\n' +
                        '.togroupstatus Alson XMD is online 🤖'
                },
                { quoted: message }
            );
            return;
        }

        // Get group name
        let groupName = 'Group';

        try {
            const metadata = await sock.groupMetadata(chatId);
            groupName = metadata?.subject || 'Group';
        } catch {}

        // Post text status
        await sock.relayMessage(
            'status@broadcast',
            {
                extendedTextMessage: {
                    text: statusText,
                    contextInfo: {
                        mentionedJid: []
                    }
                }
            },
            {
                statusJidList: [chatId]
            }
        );

        await sock.sendMessage(
            chatId,
            {
                text:
                    `✅ *Status posted!*\n\n` +
                    `👥 Group: ${groupName}\n` +
                    `📝 ${statusText}`
            },
            { quoted: message }
        );

        console.log(`✅ Group status posted: ${groupName}`);

    } catch (error) {
        console.error('❌ togroupstatus error:', error);

        await sock.sendMessage(
            chatId,
            {
                text:
                    '❌ Failed to post the group status.\n\n' +
                    'WhatsApp may have rejected the status request.'
            },
            { quoted: message }
        ).catch(() => {});
    }
}

module.exports = toGroupStatus;
