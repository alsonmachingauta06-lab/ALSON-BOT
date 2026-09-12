const https = require('https');

const YCLOUD_API_KEY = process.env.YCLOUD_API_KEY;
const BUSINESS_PHONE = process.env.YCLOUD_BUSINESS_PHONE || '263783549857';

const conversations = new Map();

function callAI(userMessage, history = []) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: 'openai',
            messages: [
                {
                    role: 'system',
                    content: 'You are Alson XMD, a helpful WhatsApp assistant. Be natural, concise and accurate. Do not claim to be human.'
                },
                ...history,
                {
                    role: 'user',
                    content: userMessage
                }
            ]
        });

        const request = https.request({
            hostname: 'gen.pollinations.ai',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (result.error) {
                        return reject(new Error(
                            result.error.message || 'AI request failed'
                        ));
                    }

                    const reply = result.choices?.[0]?.message?.content;

                    if (!reply) {
                        return reject(new Error('AI returned no response'));
                    }

                    resolve(reply.trim());
                } catch (error) {
                    reject(new Error('Invalid AI response'));
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

function sendYCloudMessage(to, text) {
    return new Promise((resolve, reject) => {
        if (!YCLOUD_API_KEY) {
            return reject(new Error('YCLOUD_API_KEY is not configured'));
        }

        const payload = JSON.stringify({
            from: BUSINESS_PHONE,
            to,
            type: 'text',
            text: {
                body: text,
                preview_url: false
            }
        });

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
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                } else {
                    reject(new Error(
                        `YCloud API ${response.statusCode}: ${data}`
                    ));
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

async function handleYCloudMessage(from, text) {
    if (!from || !text) return;

    const history = conversations.get(from) || [];

    const reply = await callAI(text, history);

    const updatedHistory = [
        ...history,
        { role: 'user', content: text },
        { role: 'assistant', content: reply }
    ].slice(-12);

    conversations.set(from, updatedHistory);

    await sendYCloudMessage(from, reply);

    return reply;
}

module.exports = {
    handleYCloudMessage,
    sendYCloudMessage
};
