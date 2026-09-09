const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

async function playCommand(sock, chatId, message) {
    console.log('🎵 PLAY HANDLER ENTERED');

    let outputFile = null;

    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const searchQuery = text
            .split(/\s+/)
            .slice(1)
            .join(' ')
            .trim();

        if (!searchQuery) {
            return await sock.sendMessage(
                chatId,
                {
                    text:
                        '🎵 *What song do you want to download?*\n\n' +
                        'Example:\n.play Faded Alan Walker'
                },
                { quoted: message }
            );
        }

        await sock.sendMessage(
            chatId,
            {
                text: `🔎 Searching for *${searchQuery}*...`
            },
            { quoted: message }
        );

        const { videos } = await yts(searchQuery);

        if (!videos || videos.length === 0) {
            return await sock.sendMessage(
                chatId,
                {
                    text: '❌ *No song found.*'
                },
                { quoted: message }
            );
        }

        const video = videos[0];

        await sock.sendMessage(
            chatId,
            {
                image: { url: video.thumbnail },
                caption:
                    `🎵 *${video.title}*\n\n` +
                    `👤 ${video.author?.name || 'Unknown'}\n` +
                    `⏱️ ${video.timestamp || 'Unknown'}\n\n` +
                    `⬇️ Downloading audio...`
            },
            { quoted: message }
        );

        const safeName = `song_${Date.now()}`;

        const outputTemplate = path.join(
            DOWNLOAD_DIR,
            `${safeName}.%(ext)s`
        );

        await youtubedl(video.url, {
            noPlaylist: true,
            noWarnings: true,
            quiet: true,
            format: 'bestaudio',
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '5',
            output: outputTemplate
        });

        const files = fs.readdirSync(DOWNLOAD_DIR);

        const downloaded = files.find(file =>
            file.startsWith(safeName + '.')
        );

        if (!downloaded) {
            throw new Error(
                'yt-dlp completed but no output file was found.'
            );
        }

        outputFile = path.join(DOWNLOAD_DIR, downloaded);

        const stats = fs.statSync(outputFile);

        if (!stats.size) {
            throw new Error('Downloaded file is empty.');
        }

        await sock.sendMessage(
            chatId,
            {
                audio: fs.readFileSync(outputFile),
                mimetype: 'audio/mpeg',
                fileName:
                    `${video.title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`
            },
            { quoted: message }
        );

        console.log(`✅ .play completed: ${video.title}`);

    } catch (error) {
        console.error('PLAY ERROR:', error);

        await sock.sendMessage(
            chatId,
            {
                text:
                    '❌ *Failed to download song.*\n\n' +
                    'Please try another song or try again shortly.'
            },
            { quoted: message }
        );

    } finally {
        if (outputFile && fs.existsSync(outputFile)) {
            try {
                fs.unlinkSync(outputFile);
            } catch (e) {
                console.error(
                    'Cleanup error:',
                    e.message
                );
            }
        }
    }
}

module.exports = playCommand;
