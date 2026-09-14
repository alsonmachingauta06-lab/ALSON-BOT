const https = require('https');
const settings = require('./settings.js');
const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const INSTANCE_ID =
    process.env.GREEN_API_INSTANCE_ID || '710722736625';

const API_TOKEN =
    process.env.GREEN_API_TOKEN || '';

const API_HOST =
    process.env.GREEN_API_HOST || '7107.api.greenapi.com';

const DOWNLOAD_DIR = path.join(__dirname, 'tmp');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const processedMessages = new Set();

const OWNER_NUMBERS = new Set([
    '263783549857',
    '263786359833'
]);

let chatbotEnabled = true;

function normalizeNumber(value) {
    if (!value) return '';

    return String(value)
        .replace(/@s\.whatsapp\.net$/, '')
        .replace(/@c\.us$/, '')
        .replace(/@g\.us$/, '')
        .replace(/:\d+$/, '')
        .replace(/\D/g, '');
}

function isOwner(number) {
    return OWNER_NUMBERS.has(normalizeNumber(number));
}

function greenApiRequest(method, payload = null) {
    return new Promise((resolve, reject) => {
        if (!API_TOKEN) {
            return reject(
                new Error('GREEN_API_TOKEN is not configured')
            );
        }

        const body =
            payload !== null
                ? JSON.stringify(payload)
                : null;

        const request = https.request(
            {
                hostname: API_HOST,
                path:
                    `/waInstance${INSTANCE_ID}` +
                    `/${method}/${API_TOKEN}`,
                method: body ? 'POST' : 'GET',
                headers: body
                    ? {
                        'Content-Type': 'application/json',
                        'Content-Length':
                            Buffer.byteLength(body)
                    }
                    : {}
            },
            response => {
                let data = '';

                response.on('data', chunk => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (
                        response.statusCode < 200 ||
                        response.statusCode >= 300
                    ) {
                        return reject(
                            new Error(
                                `GREEN-API HTTP ${response.statusCode}: ${data}`
                            )
                        );
                    }

                    try {
                        resolve(
                            data
                                ? JSON.parse(data)
                                : {}
                        );
                    } catch {
                        resolve(data);
                    }
                });
            }
        );

        request.on('error', reject);

        if (body) {
            request.write(body);
        }

        request.end();
    });
}

async function sendGreenApiText(chatId, message) {
    return greenApiRequest('sendMessage', {
        chatId,
        message
    });
}

async function sendGreenApiFile(
    chatId,
    filePath,
    fileName,
    caption = ''
) {
    return new Promise((resolve, reject) => {
        if (!API_TOKEN) {
            return reject(
                new Error('GREEN_API_TOKEN is not configured')
            );
        }

        const boundary =
            '----AlsonXMD' +
            Date.now().toString(16);

        const fileData =
            fs.readFileSync(filePath);

        const chunks = [];

        const addField = (name, value) => {
            chunks.push(
                Buffer.from(
                    `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
                    `${value}\r\n`
                )
            );
        };

        addField('chatId', chatId);

        if (caption) {
            addField('caption', caption);
        }

        addField('fileName', fileName);

        chunks.push(
            Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                `Content-Type: application/octet-stream\r\n\r\n`
            )
        );

        chunks.push(fileData);

        chunks.push(
            Buffer.from(
                `\r\n--${boundary}--\r\n`
            )
        );

        const body =
            Buffer.concat(chunks);

        const mediaHost =
            process.env.GREEN_API_MEDIA_HOST ||
            '7107.media.greenapi.com';

        const request =
            https.request(
                {
                    hostname: mediaHost,
                    path:
                        `/waInstance${INSTANCE_ID}` +
                        `/sendFileByUpload/${API_TOKEN}`,
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            `multipart/form-data; boundary=${boundary}`,
                        'Content-Length':
                            body.length
                    }
                },
                response => {
                    let data = '';

                    response.on(
                        'data',
                        chunk => {
                            data += chunk;
                        }
                    );

                    response.on(
                        'end',
                        () => {
                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {
                                return reject(
                                    new Error(
                                        `GREEN-API file HTTP ${response.statusCode}: ${data}`
                                    )
                                );
                            }

                            try {
                                resolve(
                                    data
                                        ? JSON.parse(data)
                                        : {}
                                );
                            } catch {
                                resolve(data);
                            }
                        }
                    );
                }
            );

        request.on(
            'error',
            reject
        );

        request.write(body);
        request.end();
    });
}

async function sendGreenApiAudio(
    chatId,
    filePath,
    caption = ''
) {
    return sendGreenApiFile(
        chatId,
        filePath,
        path.basename(filePath),
        caption
    );
}

function formatTime(seconds) {
    const days =
        Math.floor(seconds / (24 * 60 * 60));

    seconds %= 24 * 60 * 60;

    const hours =
        Math.floor(seconds / (60 * 60));

    seconds %= 60 * 60;

    const minutes =
        Math.floor(seconds / 60);

    seconds =
        Math.floor(seconds % 60);

    let time = '';

    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') {
        time += `${seconds}s`;
    }

    return time.trim();
}

function buildPing() {
    return `📡 *Pong!* 🏓

╔══ *🤖 Alson XMD 🤖* ════╗
║
║ 🚀 *Ping: GREEN-API*
║ ⏱️ *Uptime: ${formatTime(process.uptime())}*
║ 🔖 *Version: ${settings.version || '1.0.0'}*
║
║ 👑 *Owner: Alson Machingauta*
╚════════════════════╝`;
}

function buildMenu() {
    const now = new Date();

    const time = now.toLocaleTimeString(
        'en-US',
        {
            timeZone:
                settings.timezone ||
                'Africa/Harare',
            hour12: true
        }
    );

    const date = now.toLocaleDateString(
        'en-US',
        {
            timeZone:
                settings.timezone ||
                'Africa/Harare'
        }
    );

    return `╔═══ *🤖 ALSON XMD 🤖* ═══╗

👋 *Hello! Welcome to Alson XMD.*

╭━━━〔 *BOT INFO* 〕━━━╮
┃ 👤 Owner: *${settings.botOwner || 'Alson Machingauta'}*
┃ 🤖 Bot: *${settings.botName || 'Alson XMD'}*
┃ 🧠 Version: *${settings.version || '1.0.0'}*
┃ 📞 Owner: *263783549857*
┃ 📥 Prefix: *None*
┃ 🌍 Timezone: *${settings.timezone || 'Africa/Harare'}*
┃ ⏰ Time: *${time}*
┃ 📅 Date: *${date}*
┃ 📢 Channel: *Alson XMD*
┃ 💻 Mode: *Public*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 *COMMANDS* 〕━━━╮
┃
┃ 🏓 *ping*
┃ 📋 *menu*
┃ ❓ *help*
┃ 🤖 *bot*
┃ 📃 *list*
┃ 🎵 *play <song>*
┃
╰━━━━━━━━━━━━━━━━━━╯

💡 *Commands do not require a prefix.*

Example:
*ping*

*menu*

*play Believer*

╔══════════════════════❥❥❥
✧ *Alson XMD*
╚══════════════════════❥❥❥
© 2025-2026`;
}

async function handleGreenApiPlay({
    chatId,
    text
}) {
    let inputFile = null;
    let outputFile = null;

    try {
        const searchQuery =
            text
                .trim()
                .split(/\s+/)
                .slice(1)
                .join(' ')
                .trim();

        if (!searchQuery) {
            await sendGreenApiText(
                chatId,
                '🎵 Please give me a song name.\n\n' +
                'Example: play Shape of You'
            );
            return;
        }

        console.log(
            `🎵 GREEN-API PLAY SEARCH: ${searchQuery}`
        );

        const { videos } =
            await yts(searchQuery);

        if (
            !videos ||
            videos.length === 0
        ) {
            await sendGreenApiText(
                chatId,
                '❌ I could not find that song.'
            );
            return;
        }

        const video = videos[0];

        console.log(
            `🎵 GREEN-API PLAY FOUND: ${video.title}`
        );

        const safeName =
            `greenapi_${Date.now()}`;

        const inputTemplate =
            path.join(
                DOWNLOAD_DIR,
                `${safeName}.%(ext)s`
            );

        inputFile =
            path.join(
                DOWNLOAD_DIR,
                `${safeName}.mp3`
            );

        outputFile =
            path.join(
                DOWNLOAD_DIR,
                `${safeName}.ogg`
            );

        await youtubedl(
            video.url,
            {
                noPlaylist: true,
                noWarnings: true,
                quiet: true,
                format: 'bestaudio',
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: '5',
                output: inputTemplate
            }
        );

        const downloadedFiles =
            fs.readdirSync(DOWNLOAD_DIR);

        const downloaded =
            downloadedFiles.find(
                file =>
                    file.startsWith(
                        safeName + '.'
                    )
            );

        if (!downloaded) {
            throw new Error(
                'YouTube download completed but no file was found.'
            );
        }

        inputFile =
            path.join(
                DOWNLOAD_DIR,
                downloaded
            );

        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-i',
                inputFile,
                '-c:a',
                'libopus',
                '-b:a',
                '96k',
                '-vbr',
                'on',
                outputFile
            ]
        );

        if (
            !fs.existsSync(outputFile)
        ) {
            throw new Error(
                'FFmpeg did not create the OGG file.'
            );
        }

        const stats =
            fs.statSync(outputFile);

        if (!stats.size) {
            throw new Error(
                'Generated audio file is empty.'
            );
        }

        await sendGreenApiAudio(
            chatId,
            outputFile,
            `🎵 ${video.title}`
        );

        console.log(
            `✅ GREEN-API PLAY SENT: ${video.title}`
        );
    } catch (error) {
        console.error(
            '❌ GREEN-API PLAY ERROR:',
            error.message
        );

        try {
            await sendGreenApiText(
                chatId,
                '❌ Failed to download or send that song.'
            );
        } catch (sendError) {
            console.error(
                '❌ GREEN-API PLAY ERROR MESSAGE:',
                sendError.message
            );
        }
    } finally {
        for (
            const file of [
                inputFile,
                outputFile
            ]
        ) {
            if (
                file &&
                fs.existsSync(file)
            ) {
                try {
                    fs.unlinkSync(file);
                } catch (error) {
                    console.error(
                        '🧹 GREEN-API CLEANUP ERROR:',
                        error.message
                    );
                }
            }
        }
    }
}

async function handleGreenApiMessage({
    chatId,
    text,
    senderName,
    sender
}) {
    try {
        if (!chatId || !text) {
            return;
        }

        const command =
            text.trim().toLowerCase();

        if (
            command === 'bot on' ||
            command === 'bot off'
        ) {
            if (!isOwner(sender)) {
                await sendGreenApiText(
                    chatId,
                    '❌ Only the bot owner can change the chatbot status.'
                );
                return;
            }

            chatbotEnabled =
                command === 'bot on';

            await sendGreenApiText(
                chatId,
                chatbotEnabled
                    ? '🤖 *Alson XMD chatbot is now ON.*'
                    : '🛑 *Alson XMD chatbot is now OFF.*'
            );

            console.log(
                `⚙️ GREEN-API CHATBOT: ${
                    chatbotEnabled
                        ? 'ON'
                        : 'OFF'
                }`
            );

            return;
        }

        console.log(
            `📩 GREEN-API MESSAGE from ${
                senderName || sender || 'unknown'
            }: ${text}`
        );

        if (
            command === 'ping' ||
            command === 'help' ||
            command === 'menu' ||
            command === 'bot' ||
            command === 'list'
        ) {
            if (command === 'ping') {
                await sendGreenApiText(
                    chatId,
                    buildPing()
                );
            } else {
                await sendGreenApiText(
                    chatId,
                    buildMenu()
                );
            }

            return;
        }

        if (
            command === 'play' ||
            command.startsWith('play ')
        ) {
            await handleGreenApiPlay({
                chatId,
                text
            });

            return;
        }

        if (!chatbotEnabled) {
            console.log(
                '🛑 GREEN-API AI: chatbot is OFF'
            );
            return;
        }

        const apiKey =
            process.env.POLLINATIONS_API_KEY;

        if (!apiKey) {
            console.error(
                '❌ GREEN-API AI: POLLINATIONS_API_KEY is missing'
            );
            return;
        }

        const prompt = `You are Alson, a friendly WhatsApp user.

Talk naturally and casually.
Keep replies short and useful.
Use emojis when appropriate.
Do not say you are an AI unless directly asked.
Do not use long explanations unless the user asks.
Match the user's language and vibe.

User message:
${text}`;

        const body =
            JSON.stringify({
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
            });

        const response =
            await new Promise(
                (resolve, reject) => {
                    const request =
                        https.request(
                            {
                                hostname:
                                    'gen.pollinations.ai',
                                path:
                                    '/v1/chat/completions',
                                method: 'POST',
                                headers: {
                                    Authorization:
                                        `Bearer ${apiKey}`,
                                    'Content-Type':
                                        'application/json',
                                    'Content-Length':
                                        Buffer.byteLength(
                                            body
                                        )
                                }
                            },
                            response => {
                                let data = '';

                                response.on(
                                    'data',
                                    chunk => {
                                        data += chunk;
                                    }
                                );

                                response.on(
                                    'end',
                                    () => {
                                        resolve({
                                            statusCode:
                                                response.statusCode,
                                            body:
                                                data
                                        });
                                    }
                                );
                            }
                        );

                    request.on(
                        'error',
                        reject
                    );

                    request.write(body);
                    request.end();
                }
            );

        if (
            response.statusCode < 200 ||
            response.statusCode >= 300
        ) {
            console.error(
                '❌ GREEN-API AI HTTP ERROR:',
                response.statusCode
            );
            return;
        }

        let result;

        try {
            result =
                JSON.parse(
                    response.body
                );
        } catch {
            console.error(
                '❌ GREEN-API AI returned invalid JSON'
            );
            return;
        }

        const replyText =
            result
                ?.choices?.[0]
                ?.message
                ?.content
                ?.trim();

        if (!replyText) {
            console.error(
                '❌ GREEN-API AI returned no reply'
            );
            return;
        }

        await sendGreenApiText(
            chatId,
            replyText
        );

        console.log(
            '✅ GREEN-API AI replied successfully'
        );
    } catch (error) {
        console.error(
            '❌ GREEN-API chatbot error:',
            error.message
        );
    }
}

module.exports = {
    handleGreenApiMessage,
    sendGreenApiText
};
