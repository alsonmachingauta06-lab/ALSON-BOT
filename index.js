const fs = require('fs');
const path = require('path');
const http = require('http');

const log = (...args) =>
    process.stderr.write(
        args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') + '\n'
    );

const c = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

function getDeploymentPlatform() {
    if (process.env.RENDER) return 'Render';
    if (process.env.CODESPACE_NAME) return 'Codespaces';
    if (process.env.PANEL_APP) return 'Panel';
    if (process.env.REPL_SLUG) return 'Replit';
    if (process.env.KOYEB_APP) return 'Koyeb';
    if (process.env.FLY_APP_NAME) return 'Fly.io';
    if (process.env.GLITCH_PROJECT_ID) return 'Glitch';
    if (process.env.VERCEL) return 'Vercel';
    if (process.env.HEROKU_APP_NAME) return 'Heroku';
    if (process.env.RAILWAY_ENVIRONMENT) return 'Railway';
    return 'Local Machine';
}

global.File = class File {};

require('./settings');
require('dotenv').config();

const {
    handleMessages,
    handleGroupParticipantUpdate
} = require('./main');

const {
    handleStatusUpdate,
    handleBulkStatusUpdate
} = require('./commands/autostatus');

const {
    storeMessage
} = require('./commands/antidelete');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require('@whiskeysockets/baileys');

const NodeCache = require('node-cache');
const pino = require('pino');

const {
    smsg
} = require('./lib/myfunc');

const {
    rmSync
} = require('fs');

let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = 10;

const store = require('./lib/lightweight_store');

try {
    store.readFromFile();
} catch (e) {}

const settings = require('./settings');

global.botname = 'Alson XMD';
global.themeemoji = '🤖';

const phoneNumber = '263786359833';

//*
|--------------------------------------------------------------------------
| STORE SAVE
|--------------------------------------------------------------------------
*//

const storeWriteInterval =
    Number(settings.storeWriteInterval) || 30000;

setInterval(() => {
    try {
        store.writeToFile();
    } catch (e) {}
}, storeWriteInterval);

//*
|--------------------------------------------------------------------------
| STATUS CONFIG
|--------------------------------------------------------------------------
*//

function readStatusConfig() {
    try {
        const file = path.join(
            __dirname,
            'data',
            'autostatus.json'
        );

        if (fs.existsSync(file)) {
            const config = JSON.parse(
                fs.readFileSync(file, 'utf8')
            );

            return {
                enabled: config.enabled === true,
                likeOn: config.likeOn === true,
                selfOn: config.selfOn === true
            };
        }
    } catch (e) {}

    return {
        enabled: false,
        likeOn: false,
        selfOn: false
    };
}

//*
|--------------------------------------------------------------------------
| BOT MODE
|--------------------------------------------------------------------------
*//

function getBotMode() {
    try {
        const file = path.join(
            __dirname,
            'data',
            'messageCount.json'
        );

        if (fs.existsSync(file)) {
            const data = JSON.parse(
                fs.readFileSync(file, 'utf8')
            );

            if (typeof data.isPublic === 'boolean') {
                return data.isPublic
                    ? 'Public'
                    : 'Private';
            }
        }

        return 'Public';
    } catch (e) {
        return 'Public';
    }
}

//*
|--------------------------------------------------------------------------
| MEMORY MANAGEMENT
|--------------------------------------------------------------------------
*//

setInterval(() => {
    try {
        const memory =
            process.memoryUsage().rss /
            1024 /
            1024;

        if (
            memory > 500 &&
            global.gc
        ) {
            global.gc();
        }

        if (memory > 750) {
            log(
                c.yellow +
                '⚠️ Memory usage high. Restarting...' +
                c.reset
            );

            process.exit(1);
        }
    } catch (e) {}
}, 5 * 60 * 1000);

setInterval(() => {
    try {
        if (global.gc) {
            global.gc();
        }
    } catch (e) {}
}, 120000);

//*
|--------------------------------------------------------------------------
| LOW-DATA HEARTBEAT
|--------------------------------------------------------------------------
|
| Old version:
|     every 1 second
|
| New version:
|     every 5 minutes
|
|--------------------------------------------------------------------------
*//

async function startHeartbeat() {

    if (global.alsonHeartbeat) {
        clearInterval(
            global.alsonHeartbeat
        );

        global.alsonHeartbeat = null;
    }

    const heartbeat = async () => {
        try {

            await fetch(
                'https://gemini-proxy-5t1s.onrender.com/v1/heartbeat',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        botId:
                            settings.ownerNumber ||
                            phoneNumber,

                        userId:
                            settings.ownerNumber ||
                            phoneNumber,

                        platform:
                            getDeploymentPlatform(),

                        botOwner:
                            settings.botOwner ||
                            'Alson Machingauta',

                        timezone:
                            settings.timezone ||
                            'Africa/Harare',

                        botName:
                            settings.botName ||
                            'Alson XMD'
                    })
                }
            );

        } catch (e) {}
    };

    await heartbeat();

    global.alsonHeartbeat =
        setInterval(
            heartbeat,
            5 * 60 * 1000
        );
}

//*
|--------------------------------------------------------------------------
| STOP HEARTBEAT
|--------------------------------------------------------------------------
*//

function stopHeartbeat() {

    if (global.alsonHeartbeat) {

        clearInterval(
            global.alsonHeartbeat
        );

        global.alsonHeartbeat = null;
    }
}

//*
//*
|--------------------------------------------------------------------------
| RENDER WEB SERVER
|--------------------------------------------------------------------------
*//

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('ALSON XMD is running!');
});

server.listen(PORT, '0.0.0.0', () => {
    log(
        c.green +
        `🌐 Render server listening on port ${PORT}` +
        c.reset
    );
});
//*|--------------------------------------------------------------------------
| START BOT
|--------------------------------------------------------------------------
*//

async function startXeonBotInc() {

    try {

        log(
            c.cyan +
            '🚀 Starting Alson XMD...' +
            c.reset
        );

        //*
        |--------------------------------------------------------------------------
        | AUTH STATE
        |--------------------------------------------------------------------------
        *//

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                './session'
            );

        //*
        |--------------------------------------------------------------------------
        | BAILEYS VERSION
        |--------------------------------------------------------------------------
        *//

        let version;

        try {

            const latest =
                await fetchLatestBaileysVersion();

            version = latest.version;

        } catch (e) {

            version = [
                2,
                3000,
                1015901307
            ];
        }

        //*
        |--------------------------------------------------------------------------
        | MESSAGE RETRY CACHE
        |--------------------------------------------------------------------------
        *//

        const msgRetryCounterCache =
            new NodeCache({
                stdTTL: 300,
                useClones: false
            });

        //*
        |--------------------------------------------------------------------------
        | WHATSAPP SOCKET
        |--------------------------------------------------------------------------
        *//

        const sock =
            makeWASocket({

                version,

                logger:
                    pino({
                        level: 'silent'
                    }),

                printQRInTerminal: false,

                browser: [
                    'Windows',
                    'Chrome',
                    '10.0.22631'
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

                //*
                |--------------------------------------------------------------------------
                | LOWER TRAFFIC
                |--------------------------------------------------------------------------
                *//

                generateHighQualityLinkPreview:
                    false,

                syncFullHistory: false,

                msgRetryCounterCache,

                defaultQueryTimeoutMs:
                    45000,

                connectTimeoutMs:
                    45000,

                keepAliveIntervalMs:
                    25000,

                getMessage:
                    async key => {

                        try {

                            const jid =
                                jidNormalizedUser(
                                    key.remoteJid
                                );

                            const message =
                                await store.loadMessage(
                                    jid,
                                    key.id
                                );

                            return (
                                message?.message ||
                                ''
                            );

                        } catch (e) {

                            return '';
                        }
                    }
            });

        //*
        |--------------------------------------------------------------------------
        | SAVE CREDENTIALS
        |--------------------------------------------------------------------------
        *//

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        //*
        |--------------------------------------------------------------------------
        | STORE
        |--------------------------------------------------------------------------
        *//

        try {
            store.bind(
                sock.ev
            );
        } catch (e) {}

        //*
        |--------------------------------------------------------------------------
        | MESSAGE HANDLER
        |--------------------------------------------------------------------------
        *//

        sock.ev.on(
            'messages.upsert',
            async update => {

                try {

                    if (
                        !update?.messages ||
                        !update.messages.length
                    ) {
                        return;
                    }

                    for (
                        const mek
                        of update.messages
                    ) {

                        if (
                            !mek ||
                            !mek.message
                        ) {
                            continue;
                        }

                        //*
                        |--------------------------------------------------------------------------
                        | EPHEMERAL
                        |--------------------------------------------------------------------------
                        *//

                        if (
                            Object.keys(
                                mek.message
                            )[0] ===
                            'ephemeralMessage'
                        ) {

                            mek.message =
                                mek.message
                                    .ephemeralMessage
                                    .message;
                        }

                        //*
                        |--------------------------------------------------------------------------
                        | STATUS
                        |--------------------------------------------------------------------------
                        *//

                        if (
                            mek.key?.remoteJid ===
                            'status@broadcast'
                        ) {

                            const statusConfig =
                                readStatusConfig();

                            if (
                                mek.key.fromMe
                            ) {

                                if (
                                    statusConfig.enabled &&
                                    statusConfig.selfOn
                                ) {

                                    handleStatusUpdate(
                                        sock,
                                        {
                                            ...update,
                                            messages: [mek]
                                        }
                                    ).catch(
                                        () => {}
                                    );
                                }

                            } else {

                                try {

                                    storeMessage(
                                        sock,
                                        mek
                                    );

                                } catch (e) {}

                                if (
                                    statusConfig.enabled
                                ) {

                                    handleStatusUpdate(
                                        sock,
                                        {
                                            ...update,
                                            messages: [mek]
                                        }
                                    ).catch(
                                        () => {}
                                    );
                                }
                            }

                            continue;
                        }

                        //*
                        |--------------------------------------------------------------------------
                        | IGNORE WHATSAPP SYSTEM MESSAGE
                        |--------------------------------------------------------------------------
                        *//

                        if (
                            mek.key?.id &&
                            mek.key.id.startsWith(
                                'BAE5'
                            ) &&
                            mek.key.id.length === 16
                        ) {
                            continue;
                        }

                        //*
                        |--------------------------------------------------------------------------
                        | MAIN COMMAND / CHATBOT
                        |--------------------------------------------------------------------------
                        *//

                        try {

                            await handleMessages(
                                sock,
                                {
                                    ...update,
                                    messages: [mek]
                                },
                                true
                            );

                        } catch (err) {

                            log(
                                c.red +
                                'Message handler error: ' +
                                (
                                    err?.message ||
                                    err
                                ) +
                                c.reset
                            );
                        }
                    }

                } catch (err) {

                    log(
                        c.red +
                        'messages.upsert error: ' +
                        (
                            err?.message ||
                            err
                        ) +
                        c.reset
                    );
                }
            }
        );

        //*
        |--------------------------------------------------------------------------
        | JID DECODER
        |--------------------------------------------------------------------------
        *//

        sock.decodeJid =
            jid => {

                if (!jid) {
                    return jid;
                }

                if (
                    /:\d+@/gi.test(jid)
                ) {

                    const decoded =
                        jidDecode(jid) || {};

                    if (
                        decoded.user &&
                        decoded.server
                    ) {

                        return (
                            decoded.user +
                            '@' +
                            decoded.server
                        );
                    }
                }

                return jid;
            };

        //*
        |--------------------------------------------------------------------------
        | CONTACT UPDATE
        |--------------------------------------------------------------------------
        *//

        sock.ev.on(
            'contacts.update',
            contacts => {

                try {

                    for (
                        const contact
                        of contacts
                    ) {

                        const id =
                            sock.decodeJid(
                                contact.id
                            );

                        if (
                            store?.contacts &&
                            id
                        ) {

                            store.contacts[id] = {
                                id,
                                name:
                                    contact.notify
                            };
                        }
                    }

                } catch (e) {}
            }
        );

        //*
        |--------------------------------------------------------------------------
        | GET NAME
        |--------------------------------------------------------------------------
        *//

        sock.getName =
            async (
                jid,
                withoutContact = false
            ) => {

                try {

                    const id =
                        sock.decodeJid(
                            jid
                        );

                    let contact =
                        store.contacts?.[id] ||
                        {};

                    if (
                        id.endsWith('@g.us') &&
                        !contact.subject &&
                        !contact.name
                    ) {

                        try {

                            contact =
                                await sock.groupMetadata(
                                    id
                                );

                        } catch (e) {}
                    }

                    if (
                        withoutContact
                    ) {
                        return '';
                    }

                    return (
                        contact?.name ||
                        contact?.subject ||
                        contact?.verifiedName ||
                        id
                    );

                } catch (e) {

                    return jid;
                }
            };

        //*
        |--------------------------------------------------------------------------
        | PUBLIC MODE
        |--------------------------------------------------------------------------
        *//

        sock.public = true;

        sock.serializeM =
            message =>
                smsg(
                    sock,
                    message,
                    store
                );

               //*
        |--------------------------------------------------------------------------
        | PAIRING
        |--------------------------------------------------------------------------
        *//

        if (!state.creds.registered) {

            const pn = String(phoneNumber).replace(/[^0-9]/g, '');

            try {

                const parsed =
                    require('awesome-phonenumber')('+' + pn);

                if (!parsed.isValid()) {

                    log(
                        c.red +
                        '❌ Invalid WhatsApp number.' +
                        c.reset
                    );

                    process.exit(1);
                }

            } catch (e) {

                log(
                    c.red +
                    '❌ Could not validate WhatsApp number.' +
                    c.reset
                );

                process.exit(1);
            }

            let pairingRequested = false;
            let pairingAttempts = 0;
            const MAX_PAIRING_ATTEMPTS = 3;

            const requestPairing = async () => {

                if (pairingRequested) return;

                if (state.creds.registered) return;

                if (pairingAttempts >= MAX_PAIRING_ATTEMPTS) {

                    log(
                        c.red +
                        '❌ Could not obtain a pairing code after several attempts.' +
                        c.reset
                    );

                    return;
                }

                pairingAttempts++;

                try {

                    log(
                        c.cyan +
                        `🔐 Requesting pairing code (attempt ${pairingAttempts}/${MAX_PAIRING_ATTEMPTS})...` +
                        c.reset
                    );

                    await delay(3000);

                    if (state.creds.registered) return;

                    const code =
                        await sock.requestPairingCode(pn);

                    if (!code) {

                        throw new Error(
                            'WhatsApp returned an empty pairing code'
                        );
                    }

                    pairingRequested = true;

                    const formatted =
                        code
                            .match(/.{1,4}/g)
                            ?.join('-') ||
                        code;

                    log(
                        '\n' +
                        c.bgGreen +
                        c.white +
                        ' PAIRING CODE: ' +
                        formatted +
                        ' ' +
                        c.reset +
                        '\n'
                    );

                    log(
                        c.white +
                        '📱 Enter this code in WhatsApp → Linked Devices → Link with phone number.' +
                        c.reset
                    );

                } catch (e) {

                    log(
                        c.red +
                        '❌ Pairing code error: ' +
                        (e?.message || e) +
                        c.reset
                    );

                    if (
                        pairingAttempts <
                        MAX_PAIRING_ATTEMPTS
                    ) {

                        setTimeout(
                            requestPairing,
                            5000
                        );

                    }

                }
            };

            setTimeout(
                requestPairing,
                5000
            );
        }

        //*
        |--------------------------------------------------------------------------
        | CONNECTION UPDATE
        |--------------------------------------------------------------------------
        *//
        sock.ev.on(
            'connection.update',
            async update => {

                try {

                    const {
                        connection,
                        lastDisconnect
                    } = update;

                    if (connection === 'connecting') {

                        log(
                            c.cyan +
                            '🔄 Connecting to WhatsApp...' +
                            c.reset
                        );
                    }

                    if (connection === 'open') {

                        reconnectAttempts = 0;

                        await startHeartbeat();

                        log(
                            c.green +
                            '\n✅ ALSON XMD CONNECTED!\n' +
                            c.reset
                        );

                        log(
                            c.white +
                            '🤖 Bot is ready.' +
                            c.reset
                        );

                        log(
                            c.white +
                            '📡 Low-data mode: ON' +
                            c.reset
                        );
                    }

                    if (connection === 'close') {

                        stopHeartbeat();

                        const error =
                            lastDisconnect?.error;

                        const statusCode =
                            error?.output?.statusCode;

                        log(
                            c.red +
                            '❌ WhatsApp connection closed.' +
                            c.reset
                        );

                        log(
                            c.yellow +
                            'Disconnect reason: ' +
                            (error?.message || 'Unknown') +
                            c.reset
                        );

                        log(
                            c.yellow +
                            'Status code: ' +
                            String(statusCode ?? 'none') +
                            c.reset
                        );

                        //*
                        |--------------------------------------------------------------------------
                        | REAL LOGOUT
                        |--------------------------------------------------------------------------
                        *//

                        if (
                            statusCode ===
                            DisconnectReason.loggedOut
                        ) {

                            log(
                                c.red +
                                '❌ WhatsApp session was logged out.' +
                                c.reset
                            );

                            try {

                                rmSync(
                                    './session',
                                    {
                                        recursive: true,
                                        force: true
                                    }
                                );

                            } catch (e) {}

                            return;
                        }

                        //*
                        |--------------------------------------------------------------------------
                        | RECONNECT
                        |--------------------------------------------------------------------------
                        *//

                        reconnectAttempts++;

                        if (
                            reconnectAttempts <=
                            MAX_RECONNECT_ATTEMPTS
                        ) {

                            const wait =
                                Math.min(
                                    5000 *
                                    reconnectAttempts,
                                    30000
                                );

                            log(
                                c.yellow +
                                `🔄 Reconnecting in ${wait / 1000}s...` +
                                c.reset
                            );

                            setTimeout(
                                () => {

                                    startXeonBotInc()
                                        .catch(
                                            err => {
                                                log(
                                                    c.red +
                                                    'Reconnect error: ' +
                                                    (
                                                        err?.message ||
                                                        err
                                                    ) +
                                                    c.reset
                                                );
                                            }
                                        );

                                },
                                wait
                            );

                        } else {

                            log(
                                c.red +
                                '❌ Too many reconnect attempts.' +
                                c.reset
                            );
                        }
                    }

                } catch (e) {

                    log(
                        c.red +
                        'Connection update error: ' +
                        (
                            e?.message ||
                            e
                        ) +
                        c.reset
                    );
                }
            }
        );

        //*
        |--------------------------------------------------------------------------
        | ANTICALL
        |--------------------------------------------------------------------------
        *//

        try {

            const {
                handleAnticall
            } =
                require(
                    './commands/anticall'
                );

            sock.ev.on(
                'call',
                async calls => {

                    try {

                        await handleAnticall(
                            sock,
                            calls
                        );

                    } catch (e) {}
                }
            );

        } catch (e) {}

        //*
        |--------------------------------------------------------------------------
        | GROUP PARTICIPANTS
        |--------------------------------------------------------------------------
        *//

        sock.ev.on(
            'group-participants.update',
            async update => {

                try {

                    await handleGroupParticipantUpdate(
                        sock,
                        update
                    );

                } catch (e) {}
            }
        );

        //*
        |--------------------------------------------------------------------------
        | BULK STATUS
        |--------------------------------------------------------------------------
        *//

        sock.ev.on(
            'messages.upsert',
            async update => {

                try {

                    if (
                        !update?.messages ||
                        update.messages.length <= 1
                    ) {
                        return;
                    }

                    const statusMessages =
                        update.messages.filter(
                            message =>
                                message?.key
                                    ?.remoteJid ===
                                'status@broadcast' &&
                                !message.key.fromMe &&
                                message.key.participant
                        );

                    if (
                        statusMessages.length
                    ) {

                        const config =
                            readStatusConfig();

                        if (
                            config.enabled
                        ) {

                            handleBulkStatusUpdate(
                                sock,
                                statusMessages
                            ).catch(
                                () => {}
                            );
                        }
                    }

                } catch (e) {}
            }
        );

        return sock;

    } catch (error) {

        log(
            c.red +
            '❌ Startup error: ' +
            (
                error?.message ||
                error
            ) +
            c.reset
        );

        reconnectAttempts++;

        if (
            reconnectAttempts <=
            MAX_RECONNECT_ATTEMPTS
        ) {

            const wait =
                Math.min(
                    5000 *
                    reconnectAttempts,
                    30000
                );

            await delay(wait);

            return startXeonBotInc();
        }

        throw error;
    }
}

//*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*//

log(
    c.cyan +
    c.bold +
    '\n🤖 ALSON XMD\n' +
    c.reset
);

log(
    c.white +
    '⚡ Low-data mode enabled' +
    c.reset
);

log(
    c.white +
    '🚫 Connection messages disabled' +
    c.reset
);

startXeonBotInc()
    .catch(error => {

        log(
            c.red +
            '💥 FATAL ERROR: ' +
            (
                error?.message ||
                error
            ) +
            c.reset
        );

        process.exit(1);
    });

//*
|--------------------------------------------------------------------------
| SHUTDOWN
|--------------------------------------------------------------------------
*//

async function shutdown() {

    stopHeartbeat();

    if (
        global.sessionBackupInterval
    ) {

        clearInterval(
            global.sessionBackupInterval
        );

        global.sessionBackupInterval = null;
    }

    try {

        require(
            './commands/autorecord'
        ).stopAllInfiniteRecordings();

    } catch (e) {}

    try {

        require(
            './commands/autotyping'
        ).stopAllInfiniteTyping();

    } catch (e) {}

    //*
    |--------------------------------------------------------------------------
    | OFFLINE NOTIFICATION
    |--------------------------------------------------------------------------
    |
    | This is only sent when you manually stop Termux.
    |
    |--------------------------------------------------------------------------
    *//

    try {

        await fetch(
            'https://gemini-proxy-5t1s.onrender.com/v1/offline',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    botId:
                        settings.ownerNumber ||
                        phoneNumber
                })
            }
        );

    } catch (e) {}

    process.exit(0);
}

process.on(
    'SIGINT',
    shutdown
);

process.on(
    'SIGTERM',
    shutdown
);

//*
|--------------------------------------------------------------------------
| ERROR HANDLING
|--------------------------------------------------------------------------
*//

process.on(
    'uncaughtException',
    error => {

        log(
            c.red +
            'Uncaught Exception: ' +
            (
                error?.message ||
                error
            ) +
            c.reset
        );
    }
);

process.on(
    'unhandledRejection',
    error => {

        log(
            c.red +
            'Unhandled Rejection: ' +
            (
                error?.message ||
                error
            ) +
            c.reset
        );
    }
);
