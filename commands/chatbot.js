const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CHATBOT_DATA = path.join(__dirname, '../data/chatbot.json');

function loadChatbotData() {
    try {
        if (fs.existsSync(CHATBOT_DATA)) {
            return JSON.parse(
                fs.readFileSync(CHATBOT_DATA, 'utf8')
            );
        }
    } catch (e) {
        console.error('Chatbot data error:', e.message);
    }

    return {
        dms: false,
        groups: false,
        status: false,
        chats: {}
    };
}

function saveChatbotData(data) {
    const dir = path.dirname(CHATBOT_DATA);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
        CHATBOT_DATA,
        JSON.stringify(data, null, 2)
    );
}

async function reply(sock, chatId, msg, quoted) {
    return sock.sendMessage(
        chatId,
        { text: msg },
        { quoted }
    );
}

async function chatbotCommand(sock, chatId, message) {
    try {
        const senderId =
            message.key.participant ||
            message.key.remoteJid;

        const botNumber =
            sock.user.id.split(':')[0] +
            '@s.whatsapp.net';

        const isOwner =
            message.key.fromMe ||
            senderId === botNumber;

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const args = text.split(/\s+/).slice(1);
        const subCommand =
            args.join(' ').toLowerCase().trim();

        const data = loadChatbotData();

        console.log('🔎 CHATBOT DATA:', JSON.stringify(data));

        const isGroup = chatId.endsWith('@g.us');

        console.log('🔎 CHAT ID:', chatId);
        console.log('🔎 IS GROUP:', isGroup);
        console.log('🔎 DMS ENABLED:', data.dms);
        console.log('🔎 GROUPS ENABLED:', data.groups);
        console.log('🔎 STATUS ENABLED:', data.status);
        console.log('🔎 CHAT SETTING:', data.chats?.[chatId]);

        if (!isOwner) {
            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ❌ Only bot owner can use this
├
╰─┬─★─☆─♪♪─◆

╭──◆「 *Alson XMD* 」◆
╰──★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'usage' || subCommand === 'help') {
            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT USAGE* 」◆
├
├◇ .chatbot dms on
├  └ Enable chatbot in private chats
├
├◇ .chatbot dms off
├  └ Disable chatbot in private chats
├
├◇ .chatbot group on
├  └ Enable chatbot in groups
├
├◇ .chatbot group off
├  └ Disable chatbot in groups
├
├◇ .chatbot status on
├  └ Enable status replies
├
├◇ .chatbot status off
├  └ Disable status replies
├
├◇ .chatbot on
├  └ Enable for this chat
├
├◇ .chatbot off
├  └ Disable for this chat
├
├◇ .chatbot
├  └ Show settings
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'dms on') {
            data.dms = true;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ✅ DMs enabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'dms off') {
            data.dms = false;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ❌ DMs disabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (
            subCommand === 'group on' ||
            subCommand === 'groups on'
        ) {
            data.groups = true;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ✅ Groups enabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (
            subCommand === 'group off' ||
            subCommand === 'groups off'
        ) {
            data.groups = false;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ❌ Groups disabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'status on') {
            data.status = true;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ✅ Status replies enabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'status off') {
            data.status = false;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ❌ Status replies disabled
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'on') {
            data.chats[chatId] = true;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ✅ Enabled for this chat
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        if (subCommand === 'off') {
            data.chats[chatId] = false;
            saveChatbotData(data);

            return reply(
                sock,
                chatId,
                `╭──◆「 *CHATBOT* 」◆
├
├◇ ❌ Disabled for this chat
├
╰─┬─★─☆─♪♪─◆`,
                message
            );
        }

        const chatStatus = data.chats[chatId];

        const currentStatus =
            chatStatus === false
                ? '❌ Off (this chat)'
                : chatStatus === true
                    ? '✅ On (this chat)'
                    : isGroup && data.groups
                        ? '✅ On (all groups)'
                        : !isGroup && data.dms
                            ? '✅ On (all DMs)'
                            : '❌ Off';

        return reply(
            sock,
            chatId,
            `╭──◆「 *CHATBOT STATUS* 」◆
├
├◇ *DMs:* ${data.dms ? '✅ On' : '❌ Off'}
├◇ *Groups:* ${data.groups ? '✅ On' : '❌ Off'}
├◇ *Status:* ${data.status ? '✅ On' : '❌ Off'}
├◇ *This Chat:* ${currentStatus}
├
├◇ *Commands:*
├  └ .chatbot dms on/off
├  └ .chatbot group on/off
├  └ .chatbot status on/off
├  └ .chatbot on/off
├
╰─┬─★─☆─♪♪─◆`,
            message
        );

    } catch (error) {
        console.error(
            'Chatbot command error:',
            error.message
        );
    }
}

async function handleChatbotResponse(
    sock,
    chatId,
    message,
    userMessage,
    senderId
) {
    try {
        const data = loadChatbotData();
        const isGroup = chatId.endsWith('@g.us');

        console.log('🔥🔥🔥 ALSON CHATBOT FILE IS RUNNING 🔥🔥🔥');
        console.log('├ chatId:', chatId);
        console.log('├ userMessage:', userMessage);
        console.log('├ isGroup:', isGroup);
        console.log('├ fromMe:', message.key.fromMe);
        console.log('├ chatSetting:', data.chats?.[chatId]);
        console.log('├ groups:', data.groups);
        console.log('├ dms:', data.dms);
        console.log('├ status:', data.status);

        // Status messages
        if (chatId === 'status@broadcast') {
            if (!data.status) {
                console.log('❌ Chatbot stopped: status is OFF');
                return;
            }
        }

        // Normal chats
        else {
            const chatSetting = data.chats?.[chatId];

            // Explicitly disabled for this chat
            if (chatSetting === false) {
                console.log('❌ Chatbot stopped: this chat is OFF');
                return;
            }

            // If this chat has no individual setting,
            // use the global DM/group setting.
            if (chatSetting !== true) {
                if (isGroup && !data.groups) {
                    console.log('❌ Chatbot stopped: groups are OFF');
                    return;
                }

                if (!isGroup && !data.dms) {
                    console.log('❌ Chatbot stopped: DMs are OFF');
                    return;
                }
            }
        }

        // Never answer commands
        if (userMessage.trim().startsWith('.')) {
            console.log('❌ Chatbot stopped: message is a command');
            return;
        }

        // Never answer the bot's own messages
        if (message.key.fromMe) {
            console.log('❌ Chatbot stopped: message is from bot');
            return;
        }

        console.log(`🤖 Chatbot processing: ${userMessage}`);

        const prompt =
`You are Alson, a friendly WhatsApp user.

Talk naturally and casually.
Keep replies short.
Use emojis when appropriate.
Do not say you are an AI unless directly asked.
Do not use long explanations unless the user asks.
Match the user's language and vibe.

User message:
${userMessage}`;

        await sock.sendPresenceUpdate(
            'composing',
            chatId
        );

        delete require.cache[
            require.resolve('../settings')
        ];

        const settings = require('../settings');

        const apiKey =
            settings.pollinationsKey ||
            process.env.POLLINATIONS_API_KEY;

        if (!apiKey) {
            console.error(
                '❌ Pollinations API key is missing.'
            );

            await sock.sendPresenceUpdate(
                'paused',
                chatId
            );

            return;
        }

        const response = await fetch(
            'https://gen.pollinations.ai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are Alson, a friendly casual WhatsApp user. Keep replies natural and concise.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 200
                })
            }
        );

        const responseText = await response.text();

        await sock.sendPresenceUpdate(
            'paused',
            chatId
        );

        if (!response.ok) {
            console.error(
                '❌ Pollinations HTTP error:',
                response.status,
                responseText
            );
            return;
        }

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error(
                '❌ Pollinations returned invalid JSON:',
                responseText
            );
            return;
        }

        const replyText =
            result?.choices?.[0]?.message?.content;

        if (replyText && replyText.trim().length > 0) {
            await sock.sendMessage(
                chatId,
                {
                    text: replyText.trim()
                },
                {
                    quoted: message
                }
            );

            console.log(
                '✅ Chatbot replied successfully.'
            );
        } else {
            console.error(
                '❌ Pollinations returned no reply:',
                JSON.stringify(result)
            );
        }

    } catch (error) {
        console.error(
            '❌ Chatbot response error:',
            error.message
        );

        try {
            await sock.sendPresenceUpdate(
                'paused',
                chatId
            );
        } catch (e) {}
    }
}

module.exports = {
    chatbotCommand,
    handleChatbotResponse
};
