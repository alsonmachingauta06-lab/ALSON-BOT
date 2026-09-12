const https = require('https');

const YCLOUD_API_KEY = process.env.YCLOUD_API_KEY;
const BUSINESS_PHONE =
    process.env.YCLOUD_BUSINESS_PHONE || '263783549857';

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

function getJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'ALSON-XMD/1.0'
            }
        }, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const json = JSON.parse(data);

                    if (response.statusCode >= 200 &&
                        response.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(
                            `Music API ${response.statusCode}`
                        ));
                    }
                } catch {
                    reject(new Error('Invalid music API response'));
                }
            });
        }).on('error', reject);
    });
}

async function searchMusic(query) {
    if (!JAMENDO_CLIENT_ID) {
        throw new Error('JAMENDO_CLIENT_ID is not configured');
    }

    const url =
        'https://api.jamendo.com/v3.0/tracks/' +
        `?client_id=${encodeURIComponent(JAMENDO_CLIENT_ID)}` +
        '&format=json' +
        '&limit=5' +
        '&type=single%20albumtrack' +
        `&namesearch=${encodeURIComponent(query)}` +
        '&audioformat=mp31';

    const result = await getJson(url);

    const tracks = result.results || [];

    return tracks.filter(track =>
        track.audiodownload_allowed !== false &&
        track.audiodownload
    );
}

async function sendYCloudAudio(to, audioUrl) {
    if (!YCLOUD_API_KEY) {
        throw new Error('YCLOUD_API_KEY is not configured');
    }

    const payload = JSON.stringify({
        from: BUSINESS_PHONE,
        to,
        type: 'audio',
        audio: {
            link: audioUrl
        }
    });

    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: 'api.ycloud.com',
            path: '/v2/whatsapp/messages/sendDirectly',
            method: 'POST',
            headers: {
                'X-API-Key': YCLOUD_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                if (
                    response.statusCode >= 200 &&
                    response.statusCode < 300
                ) {
                    resolve(data);
                } else {
                    reject(new Error(
                        `YCloud audio ${response.statusCode}: ${data}`
                    ));
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[0300-036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function scoreTrack(track, query) {
    const wanted = normalizeText(query).split(' ').filter(Boolean);
    const title = normalizeText(track.name);
    const artist = normalizeText(track.artist_name);
    const combined = `${title} ${artist}`;

    if (!wanted.length) return 0;

    let matches = 0;

    for (const word of wanted) {
        if (combined.split(' ').includes(word)) {
            matches++;
        }
    }

    return matches / wanted.length;
}

async function handleMusicRequest(to, query) {
    const tracks = await searchMusic(query);

    if (!tracks.length) {
        await require('./ycloud-chatbot')
            .sendYCloudMessage(
                to,
                `🎵 I couldn't find a downloadable track for "${query}".`
            );

        return;
    }

    const ranked = tracks
        .map(track => ({
            track,
            score: scoreTrack(track, query)
        }))
        .sort((a, b) => b.score - a.score);

    const best = ranked[0];

    // Reject weak/unrelated matches.
    if (!best || best.score < 0.5) {
        await require('./ycloud-chatbot')
            .sendYCloudMessage(
                to,
                `🎵 I couldn't find a good downloadable match for "${query}".`
            );

        return;
    }

    const track = best.track;

    await sendYCloudAudio(to, track.audiodownload);

    return {
        title: track.name,
        artist: track.artist_name
    };
}

module.exports = {
    handleMusicRequest,
    sendYCloudAudio
};
