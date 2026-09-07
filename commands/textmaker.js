 const axios = require('axios');
const mumaker = require('mumaker');


async function textmakerCommand(sock, chatId, message, q, type) {
    try {
        let usageErrorText;
        switch (type) {
            case 'metallic':
                 usageErrorText = "Example: .metallic Alson Machingauta";
                break              
            case 'ice':
                usageErrorText = "Example: .ice Alson Machingauta";
                break;
            case 'snow':
                usageErrorText = "Example: .snow Alson Machingauta";
                break;
            case 'impressive':
                usageErrorText = "Example: .impressive Alson Machingauta";
                break;
            case 'matrix':
                usageErrorText = "Example: .matrix Alson Machingauta";
                break;
            case 'light':
                usageErrorText = "Example: .light Alson Machingauta";
                break;
            case 'neon':
                usageErrorText = "Example: .neon Alson Machingauta";
                break;
            case 'devil':
                usageErrorText = "Example: .devil Alson Machingauta";
                break;
            case 'purple':
                usageErrorText = "Example: .purple Alson Machingauta";
                break;
            case 'thunder':
                usageErrorText = "Example: .thunder Alson Machingauta";
                break;
            case 'leaves':
                usageErrorText = "Example: .leaves Alson Machingauta";
                break;
            case '1917':
                usageErrorText = "Example: .1917 Alson Machingauta";
                break;
            case 'arena':
                usageErrorText = "Example: .arena Alson Machingauta";
                break;
            case 'hacker':
                usageErrorText = "Example: .hacker Alson Machingauta";
                break;
            case 'sand':
                usageErrorText = "Example: .sand Alson Machingauta";
                break;
            case 'blackpink':
                usageErrorText = "Example: .blackpink Alson Machingauta";
                break;
            case 'glitch':
                usageErrorText = "Example: .glitch Alson Machingauta";
                break;
            case 'fire':
                usageErrorText = "Example: .fire Alson Machingauta";
                break;
            default:
                usageErrorText = "Invalid text generator type.";
        }

        const text = q.split(' ').slice(1).join(' ');

        if (!text) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            return await sock.sendMessage(chatId, {
                text: `*Please provide text to generate. ${usageErrorText}*`
            });
        }

        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        let result;
        const ephotoBaseUrl = "https://en.ephoto360.com";
        let specificUrl = "";

        switch (type) {
            case 'metallic':
                specificUrl = `${ephotoBaseUrl}/impressive-decorative-3d-metal-text-effect-798.html`;
                break;              
            case 'ice':
                specificUrl = `${ephotoBaseUrl}/ice-text-effect-online-101.html`;
                break;
            case 'snow':
                specificUrl = `${ephotoBaseUrl}/create-a-snow-3d-text-effect-free-online-621.html`;
                break;
            case 'impressive':
                specificUrl = `${ephotoBaseUrl}/create-3d-colorful-paint-text-effect-online-801.html`;
                break;
            case 'matrix':
                specificUrl = `${ephotoBaseUrl}/matrix-text-effect-154.html`;
                break;
            case 'light':
                specificUrl = `${ephotoBaseUrl}/light-text-effect-futuristic-technology-style-648.html`;
                break;
            case 'neon':
                specificUrl = `${ephotoBaseUrl}/create-colorful-neon-light-text-effects-online-797.html`;
                break;
            case 'devil':
                specificUrl = `${ephotoBaseUrl}/neon-devil-wings-text-effect-online-683.html`;
                break;
            case 'purple':
                specificUrl = `${ephotoBaseUrl}/purple-text-effect-online-100.html`;
                break;
            case 'thunder':
                specificUrl = `${ephotoBaseUrl}/thunder-text-effect-online-97.html`;
                break;
            case 'leaves':
                specificUrl = `${ephotoBaseUrl}/green-brush-text-effect-typography-maker-online-153.html`;
                break;
            case '1917':
                specificUrl = `${ephotoBaseUrl}/1917-style-text-effect-523.html`;
                break;
            case 'arena':
                specificUrl = `${ephotoBaseUrl}/create-cover-arena-of-valor-by-mastering-360.html`;
                break;
            case 'hacker':
                specificUrl = `${ephotoBaseUrl}/create-anonymous-hacker-avatars-cyan-neon-677.html`;
                break;
            case 'sand':
                specificUrl = `${ephotoBaseUrl}/write-names-and-messages-on-the-sand-online-582.html`;
                break;
            case 'blackpink':
                specificUrl = `${ephotoBaseUrl}/create-a-blackpink-style-logo-with-members-signatures-810.html`;
                break;
            case 'glitch':
                specificUrl = `${ephotoBaseUrl}/create-digital-glitch-text-effects-online-767.html`;
                break;
            case 'fire':
                specificUrl = `${ephotoBaseUrl}/flame-lettering-effect-372.html`;
                break;
            default:
                await sock.sendMessage(chatId, {
                    text: "*Invalid text generator type.*"
                });
                return;
        }

        try {
            result = await mumaker.ephoto(specificUrl, text);

            if (!result || !result.image) {
                await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
                throw new Error('No image URL received from the API');
            }

            await sock.sendMessage(chatId, {
                image: { url: result.image },
                caption: "*GENERATED BY Alson XMD*"
            });
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        } catch (error) {
            console.error(`Error in text generator for type ${type}:`, error);
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            await sock.sendMessage(chatId, {
                text: `*❌ Error: Failed to generate text. Usage: ${usageErrorText}*`
            });
        }
    } catch (error) {
        console.error('Error in textmaker command:', error);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, {
            text: "*An unexpected error occurred. Please try again later.*"
        });
    }
}

module.exports = textmakerCommand;
