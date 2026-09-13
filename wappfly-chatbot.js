const https = require('https');
const settings = require('./settings.js');
const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const DOWNLOAD_DIR = path.join(__dirname, 'tmp');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}


const WAPPFLY_API_TOKEN = process.env.WAPPFLY_API_TOKEN;

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
        .replace(/:\d+$/, '')
        .replace(/\D/g, '');
}

function isOwner(number) {
    return OWNER_NUMBERS.has(normalizeNumber(number));
}

function sendWappflyText(to, text) {
    return new Promise((resolve, reject) => {
        if (!WAPPFLY_API_TOKEN) {
            return reject(new Error('WAPPFLY_API_TOKEN is not configured'));
        }

        const body = JSON.stringify({
            to,
            text,
            wait: false
        });

        const req = https.request(
            {
                hostname: 'wappfly.com',
                path: '/api/messages/send',
                method: 'POST',
                headers: {
                    'X-API-Token': WAPPFLY_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(
                            new Error(
                                `Wappfly API ${res.statusCode}: ${data}`
                            )
                        );
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;

    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;

    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';

    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

function buildPing() {
    return `📡 *Pong!* 🏓

╔══ *🤖Alson XMD🤖* ════╗
║
║  *🚀 Ping: Wappfly*
║  *⏱️ Uptime: ${formatTime(process.uptime())}*
║  *🔖 Version: ${settings.version || '1.0.0'}*
║
║   *Copyright AlsonMachingauta 2025*
╚════════════════════╝`;
}

function buildMenu() {
    const now = new Date();

    const time = now.toLocaleTimeString('en-US', {
        timeZone: settings.timezone || 'Africa/Harare',
        hour12: true
    });

    const date = now.toLocaleDateString('en-US', {
        timeZone: settings.timezone || 'Africa/Harare'
    });

    return `╔═══ *🤖 ALSON XMD 🤖* ═══╗

👋 *Hello! Welcome to Alson XMD.*

╭━━━〔 *BOT INFO* 〕━━━╮
┃ 👤 Owner: *${settings.botOwner || 'Alson Machingauta'}*
┃ 🤖 Bot: *${settings.botName || 'Alson XMD'}*
┃ 🧠 Version: *${settings.version || '1.0.0'}*
┃ 📞 Owner 1: *263783549857*
┃ 📞 Owner 2: *263786359833*
┃ 📥 Prefix: *None*
┃ 🌍 Timezone: *${settings.timezone || 'Africa/Harare'}*
┃ ⏰ Time: *${time}*
┃ 📅 Date: *${date}*
┃ 📢 Channel: *Alson XMD*
┃ 🔗 https://whatsapp.com/channel/0029Vb8pa9p5kg7CkpkxrR37
┃ 💻 Mode: *Private*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 *COMMANDS* 〕━━━╮
┃
┃ 🏓 *ping*
┃ 📋 *menu*
┃ ❓ *help*
┃ 🤖 *bot*
┃ 📃 *list*
┃ 🎵 *play <song>*
┃ 📢 *Follow our channel*
┃
╰━━━━━━━━━━━━━━━━━━╯

💡 *Commands do not require a prefix.*

Example:
*ping*

*menu*

*help*

╔══════════════════════❥❥❥
✧ *Alson XMD*
╚══════════════════════❥❥❥
© 2025-2026`;
}


async function sendWappflyImage(to, filePath, caption = '') {
    if (!WAPPFLY_API_TOKEN) {
        throw new Error('WAPPFLY_API_TOKEN is missing');
    }

    const file = fs.readFileSync(filePath).toString('base64');

    const body = JSON.stringify({
        to,
        file,
        caption,
        mimetype: 'image/jpeg'
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'wappfly.com',
                path: '/api/messages/image',
                method: 'POST',
                headers: {
                    'X-API-Token': WAPPFLY_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(
                            new Error(`Wappfly image HTTP ${res.statusCode}: ${data}`)
                        );
                    }

                    try {
                        const result = JSON.parse(data);

                        if (!result.sent) {
                            return reject(
                                new Error(`Wappfly image was not sent: ${data}`)
                            );
                        }

                        resolve(result);
                    } catch (error) {
                        reject(
                            new Error(`Invalid Wappfly image response: ${data}`)
                        );
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function sendWappflyVideo(to, filePath, caption = '') {
    if (!WAPPFLY_API_TOKEN) {
        throw new Error('WAPPFLY_API_TOKEN is missing');
    }

    const file = fs.readFileSync(filePath).toString('base64');

    const body = JSON.stringify({
        to,
        file,
        caption,
        mimetype: 'video/mp4'
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'wappfly.com',
                path: '/api/messages/video',
                method: 'POST',
                headers: {
                    'X-API-Token': WAPPFLY_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(
                            new Error(`Wappfly video HTTP ${res.statusCode}: ${data}`)
                        );
                    }

                    try {
                        const result = JSON.parse(data);

                        if (!result.sent) {
                            return reject(
                                new Error(`Wappfly video was not sent: ${data}`)
                            );
                        }

                        resolve(result);
                    } catch (error) {
                        reject(
                            new Error(`Invalid Wappfly video response: ${data}`)
                        );
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function sendWappflyAudio(to, filePath) {
    if (!WAPPFLY_API_TOKEN) {
        throw new Error('WAPPFLY_API_TOKEN is missing');
    }

    const audioBase64 = fs.readFileSync(filePath).toString('base64');

    const body = JSON.stringify({
        to,
        file: audioBase64,
        mimetype: 'audio/ogg; codecs=opus'
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'wappfly.com',
                path: '/api/messages/audio',
                method: 'POST',
                headers: {
                    'X-API-Token': WAPPFLY_API_TOKEN,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return reject(
                            new Error(
                                `Wappfly audio HTTP ${res.statusCode}: ${data}`
                            )
                        );
                    }

                    try {
                        const result = JSON.parse(data);

                        if (!result.sent) {
                            return reject(
                                new Error(
                                    `Wappfly audio was not sent: ${data}`
                                )
                            );
                        }

                        resolve(result);
                    } catch (error) {
                        reject(
                            new Error(
                                `Invalid Wappfly audio response: ${data}`
                            )
                        );
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function handleWappflyPlay({ from, text, remoteJid }) {
    let inputFile = null;
    let outputFile = null;

    try {
        const searchQuery = text
            .trim()
            .split(/\s+/)
            .slice(1)
            .join(' ')
            .trim();

        const target =
            remoteJid ||
            `${normalizeNumber(from)}@s.whatsapp.net`;

        if (!searchQuery) {
            await sendWappflyText(
                target,
                '🎵 Please give me a song name.\n\nExample: play Shape of You'
            );
            return;
        }

        console.log(`🎵 WAPPFLY PLAY SEARCH: ${searchQuery}`);

        const { videos } = await yts(searchQuery);

        if (!videos || videos.length === 0) {
            await sendWappflyText(
                target,
                '❌ I could not find that song.'
            );
            return;
        }

        const video = videos[0];

        console.log(`🎵 WAPPFLY PLAY FOUND: ${video.title}`);

        const safeName = `wappfly_${Date.now()}`;

        const inputTemplate = path.join(
            DOWNLOAD_DIR,
            `${safeName}.%(ext)s`
        );

        inputFile = path.join(
            DOWNLOAD_DIR,
            `${safeName}.mp3`
        );

        outputFile = path.join(
            DOWNLOAD_DIR,
            `${safeName}.ogg`
        );

        await youtubedl(video.url, {
            noPlaylist: true,
            noWarnings: true,
            quiet: true,
            format: 'bestaudio',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '5',
            output: inputTemplate
        });

        const downloadedFiles = fs.readdirSync(DOWNLOAD_DIR);

        const downloaded = downloadedFiles.find(file =>
            file.startsWith(safeName + '.')
        );

        if (!downloaded) {
            throw new Error(
                'YouTube download completed but no file was found.'
            );
        }

        inputFile = path.join(DOWNLOAD_DIR, downloaded);

        await execFileAsync('ffmpeg', [
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
        ]);

        if (!fs.existsSync(outputFile)) {
            throw new Error('FFmpeg did not create the OGG file.');
        }

        const stats = fs.statSync(outputFile);

        if (!stats.size) {
            throw new Error('Generated audio file is empty.');
        }

        await sendWappflyAudio(target, outputFile);

        console.log(
            `✅ WAPPFLY PLAY SENT: ${video.title}`
        );
    } catch (error) {
        console.error(
            '❌ WAPPFLY PLAY ERROR:',
            error.message
        );

        try {
            const target =
                remoteJid ||
                `${normalizeNumber(from)}@s.whatsapp.net`;

            await sendWappflyText(
                target,
                '❌ Failed to download or send that song.'
            );
        } catch (sendError) {
            console.error(
                '❌ WAPPFLY PLAY ERROR MESSAGE:',
                sendError.message
            );
        }
    } finally {
        for (const file of [inputFile, outputFile]) {
            if (file && fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                } catch (error) {
                    console.error(
                        '🧹 WAPPFLY PLAY CLEANUP ERROR:',
                        error.message
                    );
                }
            }
        }
    }
}

async function handleWappflyMessage({
    from,
    text,
    messageId,
    pushName,
    remoteJid,
    fromMe
}) {
    try {
        if (!from || !text) return;

        if (fromMe) {
            console.log('⏭️ Ignoring Wappfly own message');
            return;
        }

        // Wappfly already de-duplicates events, but keep our own guard too.
        if (messageId) {
            if (processedMessages.has(messageId)) {
                console.log('⏭️ Duplicate Wappfly message:', messageId);
                return;
            }

            processedMessages.add(messageId);

            // Keep memory bounded.
            if (processedMessages.size > 1000) {
                const first = processedMessages.values().next().value;
                processedMessages.delete(first);
            }
        }

        const command = text.trim().toLowerCase();

        // Owner-only chatbot ON/OFF controls.
        if (command === "bot on" || command === "bot off") {
            if (!isOwner(from)) {
                await sendWappflyText(remoteJid || `${normalizeNumber(from)}@s.whatsapp.net`, "❌ Only the bot owners can change the chatbot status.");
                return;
            }

            chatbotEnabled = command === "bot on";

            await sendWappflyText(
                remoteJid || `${normalizeNumber(from)}@s.whatsapp.net`,
                chatbotEnabled ? "🤖 *Alson XMD chatbot is now ON.*" : "🛑 *Alson XMD chatbot is now OFF.*"
            );

            console.log(`⚙️ WAPPFLY CHATBOT: ${chatbotEnabled ? "ON" : "OFF"}`);
            return;
        }



        console.log(
            `📩 WAPPFLY COMMAND from ${pushName || from}: ${text}`
        );

        if (
            command === 'ping' ||
            command === 'help' ||
            command === 'menu' ||
            command === 'bot' ||
            command === 'list'
        ) {
            let reply;

            if (command === 'ping') {
                reply = buildPing();
            } else {
                reply = buildMenu();
            }

            const target =
                remoteJid ||
                `${normalizeNumber(from)}@s.whatsapp.net`;

            console.log(`📤 WAPPFLY sending ${command} response`);

            if (command === 'menu') {
                const menuImage = path.join(__dirname, 'media', 'menu.jpg');
                const menuVideo = path.join(__dirname, 'media', 'menu.mp4');

                if (fs.existsSync(menuImage)) {
                    await sendWappflyImage(
                        target,
                        menuImage,
                        '🤖 *ALSON XMD*'
                    );
                    console.log('🖼️ WAPPFLY menu image sent');
                }

                if (fs.existsSync(menuVideo)) {
                    await sendWappflyVideo(
                        target,
                        menuVideo,
                        '🎬 *Alson XMD*'
                    );
                    console.log('🎬 WAPPFLY menu video sent');
                }
            }

            await sendWappflyText(target, reply);

            console.log(`✅ WAPPFLY ${command} response sent`);
            return;
        }

        if (!chatbotEnabled) {
            console.log('🛑 WAPPFLY AI: chatbot is OFF');
            return;
        }

        console.log('🤖 WAPPFLY AI: processing message');

        const apiKey = process.env.POLLINATIONS_API_KEY;

        if (!apiKey) {
            console.error('❌ WAPPFLY AI: POLLINATIONS_API_KEY is missing');
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

        try {
            const response = await new Promise((resolve, reject) => {
                const body = JSON.stringify({
                    model: 'openai',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are Alson, a friendly casual WhatsApp user. Keep replies natural and concise.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.8,
                    max_tokens: 200
                });

                const req = https.request(
                    {
                        hostname: 'gen.pollinations.ai',
                        path: '/v1/chat/completions',
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(body)
                        }
                    },
                    res => {
                        let data = '';

                        res.on('data', chunk => {
                            data += chunk;
                        });

                        res.on('end', () => {
                            resolve({
                                statusCode: res.statusCode,
                                body: data
                            });
                        });
                    }
                );

                req.on('error', reject);
                req.write(body);
                req.end();
            });

            if (response.statusCode < 200 || response.statusCode >= 300) {
                console.error(
                    '❌ WAPPFLY AI HTTP ERROR:',
                    response.statusCode,
                    response.body
                );
                return;
            }

            let result;

            try {
                result = JSON.parse(response.body);
            } catch (error) {
                console.error('❌ WAPPFLY AI returned invalid JSON');
                return;
            }

            const replyText =
                result?.choices?.[0]?.message?.content?.trim();

            if (!replyText) {
                console.error('❌ WAPPFLY AI returned no reply');
                return;
            }

            await sendWappflyText(
                remoteJid || `${normalizeNumber(from)}@s.whatsapp.net`,
                replyText
            );

            console.log('✅ WAPPFLY AI replied successfully');
        } catch (error) {
            console.error('❌ WAPPFLY AI ERROR:', error.message);
        }

        console.log('ℹ️ WAPPFLY message is not a supported command yet');

    } catch (error) {
        console.error('❌ WAPPFLY chatbot error:', error);
    }
}

module.exports = {
    handleWappflyMessage,
    sendWappflyText
};
