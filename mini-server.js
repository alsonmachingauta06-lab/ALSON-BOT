require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pino = require('pino');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const app = express();

app.use(express.json({
    limit: '50kb'
}));

const PORT = process.env.PORT || 3000;

const SESSION_ROOT =
    path.join(__dirname, 'mini-sessions');

if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT, {
        recursive: true
    });
}

/*
|--------------------------------------------------------------------------
| ACTIVE MINI BOTS
|--------------------------------------------------------------------------
*/

const bots = new Map();

/*
|--------------------------------------------------------------------------
| BASIC SECURITY / RATE LIMIT
|--------------------------------------------------------------------------
*/

const attempts = new Map();

function cleanNumber(number) {
    return String(number || '')
        .replace(/[^0-9]/g, '');
}

function validNumber(number) {
    return /^[1-9][0-9]{7,14}$/.test(number);
}

function makeBotId() {
    return crypto
        .randomBytes(8)
        .toString('hex');
}

function getSessionPath(botId) {
    return path.join(
        SESSION_ROOT,
        botId
    );
}

/*
|--------------------------------------------------------------------------
| RATE LIMIT
|--------------------------------------------------------------------------
*/

function allowed(ip) {

    const now = Date.now();

    const previous =
        attempts.get(ip) || [];

    const recent =
        previous.filter(
            time =>
                now - time < 10 * 60 * 1000
        );

    if (recent.length >= 5) {
        attempts.set(ip, recent);
        return false;
    }

    recent.push(now);

    attempts.set(ip, recent);

    return true;
}

/*
|--------------------------------------------------------------------------
| CREATE MINI BOT
|--------------------------------------------------------------------------
*/

async function createMiniBot(
    botId,
    phoneNumber
) {

    const sessionPath =
        getSessionPath(botId);

    fs.mkdirSync(
        sessionPath,
        {
            recursive: true
        }
    );

    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState(
            sessionPath
        );

    let version;

    try {

        const latest =
            await fetchLatestBaileysVersion();

        version =
            latest.version;

    } catch (error) {

        version = [
            2,
            3000,
            1015901307
        ];
    }

    const sock =
        makeWASocket({

            version,

            logger:
                pino({
                    level: 'silent'
                }),

            printQRInTerminal: false,

            browser: [
                'Alson XMD Mini',
                'Chrome',
                '120.0.0'
            ],

            auth: {
                creds: state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        state.keys,
                        pino({
                            level: 'fatal'
                        })
                    )
            },

            markOnlineOnConnect: true,

            syncFullHistory: false,

            generateHighQualityLinkPreview:
                false,

            connectTimeoutMs:
                45000,

            defaultQueryTimeoutMs:
                45000,

            keepAliveIntervalMs:
                25000
        });

    const bot =
        bots.get(botId);

    if (bot) {
        bot.sock = sock;
        bot.status = 'connecting';
    }

    sock.ev.on(
        'creds.update',
        saveCreds
    );

    /*
    |--------------------------------------------------------------------------
    | CONNECTION
    |--------------------------------------------------------------------------
    */

    sock.ev.on(
        'connection.update',
        async update => {

            const {
                connection,
                lastDisconnect
            } = update;

            const current =
                bots.get(botId);

            if (!current) {
                return;
            }

            if (
                connection ===
                'connecting'
            ) {

                current.status =
                    'connecting';
            }

            if (
                connection ===
                'open'
            ) {

                current.status =
                    'online';

                current.phone =
                    phoneNumber;

                console.log(
                    `✅ Mini bot ${botId} connected`
                );
            }

            if (
                connection ===
                'close'
            ) {

                current.status =
                    'offline';

                const code =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode;

                if (
                    code !==
                    DisconnectReason.loggedOut
                ) {

                    setTimeout(
                        () => {

                            if (
                                bots.has(
                                    botId
                                )
                            ) {

                                createMiniBot(
                                    botId,
                                    phoneNumber
                                ).catch(
                                    console.error
                                );
                            }

                        },
                        5000
                    );
                }
            }
        }
    );

    /*
    |--------------------------------------------------------------------------
    | PAIRING CODE
    |--------------------------------------------------------------------------
    */

    if (
        !state.creds.registered
    ) {

        try {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        2500
                    )
            );

            const code =
                await sock.requestPairingCode(
                    phoneNumber
                );

            const formatted =
                code
                    ?.match(
                        /.{1,4}/g
                    )
                    ?.join('-') ||
                code;

            const current =
                bots.get(botId);

            if (current) {

                current.pairingCode =
                    formatted;

                current.status =
                    'waiting';
            }

            console.log(
                `🔑 Pairing code for ${botId}: ${formatted}`
            );

        } catch (error) {

            const current =
                bots.get(botId);

            if (current) {

                current.status =
                    'error';

                current.error =
                    error.message;
            }

            console.error(
                'Pairing error:',
                error.message
            );
        }
    }

    return sock;
}

/*
|--------------------------------------------------------------------------
| HOME
|--------------------------------------------------------------------------
*/

app.get(
    '/',
    (req, res) => {

        res.json({
            name: 'Alson XMD Mini',
            status: 'running',
            version: '1.0.0',
            service: 'WhatsApp Mini Bot API'
        });
    }
);

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get(
    '/health',
    (req, res) => {

        res.json({
            status: 'healthy',
            service: 'Alson XMD Mini',
            bots: bots.size,
            uptime:
                process.uptime()
        });
    }
);

/*
|--------------------------------------------------------------------------
| CREATE PAIRING SESSION
|--------------------------------------------------------------------------
*/

app.post(
    '/api/pair',
    async (req, res) => {

        try {

            const ip =
                req.ip ||
                req.socket.remoteAddress ||
                'unknown';

            if (!allowed(ip)) {

                return res
                    .status(429)
                    .json({
                        success: false,
                        error:
                            'Too many pairing attempts. Try again later.'
                    });
            }

            const number =
                cleanNumber(
                    req.body?.phone
                );

            if (
                !validNumber(number)
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            'Enter a valid international WhatsApp number without + or spaces.'
                    });
            }

            const botId =
                makeBotId();

            bots.set(
                botId,
                {
                    id: botId,
                    phone: number,
                    status: 'starting',
                    pairingCode: null,
                    createdAt:
                        Date.now(),
                    sock: null
                }
            );

            await createMiniBot(
                botId,
                number
            );

            const bot =
                bots.get(botId);

            return res.json({
                success: true,
                botId,
                status:
                    bot?.status ||
                    'starting',
                pairingCode:
                    bot?.pairingCode ||
                    null
            });

        } catch (error) {

            console.error(
                'Pair endpoint error:',
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        'Could not create pairing session.'
                });
        }
    }
);

/*
|--------------------------------------------------------------------------
| BOT STATUS
|--------------------------------------------------------------------------
*/

app.get(
    '/api/status/:id',
    (req, res) => {

        const bot =
            bots.get(
                req.params.id
            );

        if (!bot) {

            return res
                .status(404)
                .json({
                    success: false,
                    error:
                        'Mini bot not found.'
                });
        }

        res.json({
            success: true,
            botId: bot.id,
            status: bot.status,
            phone:
                bot.phone
                    ? bot.phone.slice(0, 3) +
                      '******' +
                      bot.phone.slice(-2)
                    : null,
            pairingCode:
                bot.status ===
                'waiting'
                    ? bot.pairingCode
                    : null
        });
    }
);

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

app.post(
    '/api/logout/:id',
    async (req, res) => {

        const bot =
            bots.get(
                req.params.id
            );

        if (!bot) {

            return res
                .status(404)
                .json({
                    success: false,
                    error:
                        'Mini bot not found.'
                });
        }

        try {

            if (bot.sock) {

                try {
                    await bot.sock.logout();
                } catch (e) {}

                try {
                    bot.sock.end(
                        undefined
                    );
                } catch (e) {}
            }

        } catch (e) {}

        bots.delete(
            req.params.id
        );

        /*
        |--------------------------------------------------------------------------
        | DELETE SESSION
        |--------------------------------------------------------------------------
        */

        try {

            fs.rmSync(
                getSessionPath(
                    req.params.id
                ),
                {
                    recursive: true,
                    force: true
                }
            );

        } catch (e) {}

        res.json({
            success: true,
            message:
                'Mini bot logged out.'
        });
    }
);

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

const server =
    app.listen(
        PORT,
        () => {

            console.log(
                `🚀 Alson XMD Mini API running on port ${PORT}`
            );
        }
    );

/*
|--------------------------------------------------------------------------
| GRACEFUL SHUTDOWN
|--------------------------------------------------------------------------
*/

async function shutdown() {

    console.log(
        '\n🛑 Shutting down Mini Bot server...'
    );

    for (
        const bot
        of bots.values()
    ) {

        try {

            if (bot.sock) {
                bot.sock.end(
                    undefined
                );
            }

        } catch (e) {}
    }

    server.close(
        () => process.exit(0)
    );
}

process.on(
    'SIGINT',
    shutdown
);

process.on(
    'SIGTERM',
    shutdown
);
