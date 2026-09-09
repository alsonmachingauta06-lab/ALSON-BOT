const yts = require('yt-search');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        execFile('yt-dlp', args, {
            maxBuffer: 10 * 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
                return;
            }

            resolve(stdout.trim());
        });
    });
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
                    text: '🎵 *What song do you want to download?*\n\nExample:\n.play Faded Alan Walker'
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

        await runYtDlp([
            '--no-playlist',
            '--no-warnings',
            '--quiet',
            '-f',
            'bestaudio[ext=m4a]/bestaudio',
            '--extract-audio',
            '--audio-format',
            'mp3',
            '--audio-quality',
            '5',
            '-o',
            outputTemplate,
            video.url
        ]);

        const files = fs.readdirSync(DOWNLOAD_DIR);

        const downloaded = files.find(file =>
            file.startsWith(safeName + '.')
        );

        if (!downloaded) {
            throw new Error('yt-dlp completed but no output file was found.');
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
                fileName: `${video.title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`
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
                console.error('Cleanup error:', e.message);
            }
        }
    }
}

module.exports = playCommand;
