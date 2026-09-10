const https = require('https');

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Simple in-memory conversation history.
// This resets if Render restarts.
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

                    const reply =
                        result.choices?.[0]?.message?.content;

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

function sendMetaMessage(to, text) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
                preview_url: false,
                body: text
            }
        });

        const request = https.request({
            hostname: 'graph.facebook.com',
            path: `/v23.0/${PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
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
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Meta API ${response.statusCode}: ${data}`));
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

async function handleMetaMessage(from, text) {
    if (!from || !text) return;

    const history = conversations.get(from) || [];

    const reply = await callAI(text, history);

    const updatedHistory = [
        ...history,
        { role: 'user', content: text },
        { role: 'assistant', content: reply }
    ].slice(-12);

    conversations.set(from, updatedHistory);

    await sendMetaMessage(from, reply);

    return reply;
}

module.exports = {
    handleMetaMessage,
    sendMetaMessage
};
