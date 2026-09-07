/**
 * Alson XMD - A WhatsApp Bot
 * Join Command - Join any WhatsApp group via link
 * Letter-by-letter typing animation + dot cycle
 */

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363411442434414@newsletter',
            newsletterName: 'Alson XMD BOTS',
            serverMessageId: -1
        }
    }
};

function getBotJid(sock) {
    return sock.user.id.split(':')[0] + '@s.whatsapp.net';
}

async function isBotAlreadyInGroup(sock, groupCode) {
    try {
        const inviteInfo = await sock.groupGetInviteInfo(groupCode).catch(() => null);
        if (!inviteInfo || !inviteInfo.id) return false;
        const groupId = inviteInfo.id;
        const groups = await sock.groupFetchAllParticipating();
        for (const [id, group] of Object.entries(groups)) {
            if (id === groupId) return true;
        }
        try {
            const metadata = await sock.groupMetadata(groupId);
            const botJid = getBotJid(sock);
            if (metadata && metadata.participants) {
                return metadata.participants.some(p => p.id === botJid);
            }
        } catch (e) {}
        return false;
    } catch (error) { return false; }
}

async function joinCommand(sock, chatId, message) {
    try {
        const userMessage = message.message?.conversation?.trim() || message.message?.extendedTextMessage?.text?.trim() || '';
        const args = userMessage.split(' ').slice(1);

        if (args.length === 0) {
            await sock.sendMessage(chatId, {
                text: `👥 *JOIN COMMAND*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 *Usage:*\n└ .join <group-link>\n\n━━━━━━━━━━━━━━━━━━━━\n✨ *Examples:*\n└ .join https://chat.whatsapp.com/DNk2fx5wUEeLXCQMnTkEOf\n└ .join https://chat.whatsapp.com/ABC123def456\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *Note:*\n└ Only works for WhatsApp GROUP links\n└ Does NOT work for Channels\n\n━━━━━━━━━━━━━━━━━━━━\n💡 *Group link format:*\n└ https://chat.whatsapp.com/XXXXXX`,
                ...channelInfo
            });
            return;
        }

        const link = userMessage.slice(6).trim();

        if (!link || !link.includes('chat.whatsapp.com')) {
            await sock.sendMessage(chatId, {
                text: `❌ *INVALID GROUP LINK*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 This command only works for WhatsApp GROUP links.\n\n🔗 *Valid format:*\n└ https://chat.whatsapp.com/XXXXXX\n\n❌ *Does NOT work for:*\n└ Channel links\n└ Other WhatsApp links`,
                ...channelInfo
            });
            return;
        }

        const groupLinkRegex = /https?:\/\/(?:chat\.)?whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9]+)/i;
        const match = link.match(groupLinkRegex);
        if (!match) {
            await sock.sendMessage(chatId, { text: `❌ *INVALID LINK*\n\nCould not extract group code.`, ...channelInfo });
            return;
        }

        const groupCode = match[1];
        const dots = ['', '.', '..', '...'];

        // ── Send first character ──
        const sent = await sock.sendMessage(chatId, { text: `🔍` });

        // ── Type "CHECKING" letter by letter ──
        const word = "CHECKING";
        let typed = "🔍 ";
        for (let i = 0; i < word.length; i++) {
            typed += word[i];
            await new Promise(r => setTimeout(r, 60));
            await sock.sendMessage(chatId, {
                text: `*${typed}*`,
                edit: sent.key
            }).catch(() => {});
        }

        // ── Dots animation 3 cycles ──
        for (let cycle = 0; cycle < 3; cycle++) {
            for (let d = 0; d < 4; d++) {
                await new Promise(r => setTimeout(r, 200));
                await sock.sendMessage(chatId, {
                    text: `*🔍 CHECKING${dots[d]}*`,
                    edit: sent.key
                }).catch(() => {});
            }
        }

        // ── Check if already joined ──
        const alreadyJoined = await isBotAlreadyInGroup(sock, groupCode);

        if (alreadyJoined) {
            await sock.sendMessage(chatId, {
                text: `⚠️ *ALREADY A MEMBER*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Bot is already in this group!\n\n🔗 ${link}\n\n💡 No need to join again.`,
                edit: sent.key
            }).catch(() => {});
            return;
        }

        // ── Type "JOINING" letter by letter ──
        await sock.sendMessage(chatId, { text: `⏳`, edit: sent.key }).catch(() => {});
        const word2 = "JOINING";
        let typed2 = "⏳ ";
        for (let i = 0; i < word2.length; i++) {
            typed2 += word2[i];
            await new Promise(r => setTimeout(r, 60));
            await sock.sendMessage(chatId, {
                text: `*${typed2}*`,
                edit: sent.key
            }).catch(() => {});
        }

        // ── Dots animation 2 cycles ──
        for (let cycle = 0; cycle < 2; cycle++) {
            for (let d = 0; d < 4; d++) {
                await new Promise(r => setTimeout(r, 200));
                await sock.sendMessage(chatId, {
                    text: `*⏳ JOINING${dots[d]}*`,
                    edit: sent.key
                }).catch(() => {});
            }
        }

        // ── Attempt to join ──
        try {
            const result = await sock.groupAcceptInvite(groupCode);

            if (result) {
                await sock.sendMessage(chatId, {
                    text: `✅ *SUCCESSFULLY JOINED!*\n\n━━━━━━━━━━━━━━━━━━━━\n🎉 Bot has joined the group!\n\n🔗 ${link}\n📛 *Group ID:* ${result}\n\n🤖 Bot is now active!`,
                    edit: sent.key
                }).catch(() => {});
            } else {
                await sock.sendMessage(chatId, {
                    text: `❌ *FAILED TO JOIN*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Possible reasons:\n└ Invalid or expired link\n└ Group is full\n└ Admin approval required\n└ Bot is banned\n\n💡 Try a different link.`,
                    edit: sent.key
                }).catch(() => {});
            }
        } catch (error) {
            let errorText = `❌ *FAILED TO JOIN*\n\n━━━━━━━━━━━━━━━━━━━━\n`;
            if (error.message.includes('invite') || error.message.includes('Invalid')) errorText += `📌 Invalid or expired link\n`;
            else if (error.message.includes('full')) errorText += `📌 Group is full\n`;
            else if (error.message.includes('banned')) errorText += `📌 Bot is banned\n`;
            else if (error.message.includes('approval')) errorText += `📌 Admin approval required\n`;
            else if (error.message.includes('already')) errorText += `📌 Bot already in group\n`;
            else errorText += `📌 ${error.message}\n`;
            errorText += `\n💡 Try a different link.`;

            await sock.sendMessage(chatId, { text: errorText, edit: sent.key }).catch(() => {});
        }

    } catch (error) {
        console.error('Join error:', error);
        await sock.sendMessage(chatId, { text: `❌ *ERROR*\n\nFailed to process join command.`, ...channelInfo });
    }
}

module.exports = { joinCommand };
