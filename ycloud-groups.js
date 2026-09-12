const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'ycloud-groups.json');

function loadGroups() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveGroups(groups) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2));
}

function isWelcomeOn(groupId) {
    const groups = loadGroups();
    return groups[groupId]?.welcome === true;
}

function setWelcome(groupId, enabled) {
    if (!groupId) return false;

    const groups = loadGroups();

    if (!groups[groupId]) {
        groups[groupId] = {};
    }

    groups[groupId].welcome = Boolean(enabled);
    saveGroups(groups);

    return groups[groupId].welcome;
}

function setWelcomeMessage(groupId, message) {
    if (!groupId || !message) return false;

    const groups = loadGroups();

    if (!groups[groupId]) {
        groups[groupId] = {};
    }

    groups[groupId].welcomeMessage = String(message).trim();
    saveGroups(groups);

    return groups[groupId].welcomeMessage;
}

function getWelcomeMessage(groupId) {
    const groups = loadGroups();
    return groups[groupId]?.welcomeMessage || '👋 Welcome {user} to the group! 🎉';
}

async function sendYCloudMessage(to, text) {
    const apiKey = process.env.YCLOUD_API_KEY;

    if (!apiKey) {
        console.error('❌ YCLOUD_API_KEY is missing');
        return;
    }

    const https = require('https');

    const body = JSON.stringify({
        type: 'text',
        to,
        text: {
            body: text
        }
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.ycloud.com',
            path: '/v2/whatsapp/messages/sendDirectly',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`YCloud ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function handleGroupParticipantEvent(group) {
    if (!group || !group.groupId) return;

    if (group.type !== 'group_participants_add') return;
    if (group.status !== 'added') return;

    if (!isWelcomeOn(group.groupId)) {
        console.log('👋 Welcome is OFF for:', group.groupId);
        return;
    }

    const participants = group.addedParticipants || [];

    if (!participants.length) return;

    const groupName = group.name || 'the group';
    const template = getWelcomeMessage(group.groupId);

    for (const participant of participants) {
        const number =
            participant.phoneNumber ||
            participant.phone ||
            participant.userId ||
            participant.id ||
            '';

        const user =
            participant.name ||
            participant.displayName ||
            (number ? `@${String(number).replace(/\D/g, '')}` : 'new member');

        const message = template
            .replace(/\{user\}/gi, user)
            .replace(/\{number\}/gi, number)
            .replace(/\{group\}/gi, groupName);

        try {
            await sendYCloudMessage(group.groupId, message);
            console.log('👋 YCLOUD WELCOME SENT:', group.groupId, user);
        } catch (error) {
            console.error('❌ YCLOUD WELCOME ERROR:', error.message);
        }
    }
}

module.exports = {
    isWelcomeOn,
    setWelcome,
    setWelcomeMessage,
    getWelcomeMessage,
    handleGroupParticipantEvent
};
