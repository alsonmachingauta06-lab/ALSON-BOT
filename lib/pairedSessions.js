const fs = require('fs');
const path = require('path');
const pino = require('pino');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require('@whiskeysockets/baileys');

const BASE_DIR = path.join(process.cwd(), 'paired-sessions');
const REGISTRY_FILE = path.join(process.cwd(), 'data', 'paired.json');
const activeSessions = new Map();

function loadRegistry() {
    try {
        return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveRegistry(registry) {
    fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

function cleanNumber(number) {
    return String(number || '').replace(/\D/g, '');
}

function sessionDir(number) {
    return path.join(BASE_DIR, cleanNumber(number));
}

async function pairNumber(number) {
    const pn = cleanNumber(number);

    if (!pn || pn.length < 7 || pn.length > 15) {
        throw new Error('Invalid WhatsApp number.');
    }

    fs.mkdirSync(BASE_DIR, { recursive: true });

    const dir = sessionDir(pn);
    const { state, saveCreds } = await useMultiFileAuthState(dir);

    let version;

    try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
    } catch {
        version = [2, 3000, 1015901307];
    }

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Windows', 'Chrome', '10.0.22631'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: 'fatal' })
            )
        },
        markOnlineOnConnect: false,
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    activeSessions.set(pn, sock);

    const registry = loadRegistry();
    registry[pn] = {
        number: pn,
        sessionDir: sessionDir(pn),
        pairedAt: registry[pn]?.pairedAt || new Date().toISOString()
    };
    saveRegistry(registry);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log(`✅ Paired account connected: ${pn}`);
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;

            if (code !== DisconnectReason.loggedOut) {
                console.log(`🔄 Paired account disconnected: ${pn}`,lastDisconnect?.error?.message||lastDisconnect?.error,code);
            } else {
                console.log(`🚪 Paired account logged out: ${pn}`);
                activeSessions.delete(pn);
            }
        }
    });

    if (!state.creds.registered) {

        console.log(`🔐 Requesting pairing code: ${pn}`); await sock.waitForSocketOpen(); const code = await sock.requestPairingCode(pn); console.log(`🔑 Pairing code received: ${pn}`);

        return {
            number: pn,
            code,
            sock
        };
    }

    return {
        number: pn,
        code: null,
        sock
    };
}

async function depairNumber(number) {
    const pn = cleanNumber(number);
    const dir = sessionDir(pn);
    const sock = activeSessions.get(pn);

    if (sock) {
        try {
            await sock.logout();
        } catch (e) {}

        try {
            sock.end(undefined);
        } catch (e) {}

        activeSessions.delete(pn);
    }

    if (!fs.existsSync(dir)) {
        return false;
    }

    fs.rmSync(dir, { recursive: true, force: true });

    const registry = loadRegistry();
    delete registry[pn];
    saveRegistry(registry);

    return true;
}

async function restorePairedSessions() {
    const registry = loadRegistry();

    for (const number of Object.keys(registry)) {
        try {
            await pairNumber(number);
            console.log(`♻️ Restored paired session: ${number}`);
        } catch (error) {
            console.log(`⚠️ Failed to restore paired session: ${number} - ${error?.message || error}`);
        }
    }
}

module.exports = {
    pairNumber,
    depairNumber,
    cleanNumber,
    restorePairedSessions
};
