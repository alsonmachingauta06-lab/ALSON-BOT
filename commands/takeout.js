/**
 * Alson XMD - Takeout Game
 * Randomly eliminate players until one winner remains
 * Bot and Bot Owner are automatically excluded from playing
 */

const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const GAME_FILE = path.join(__dirname, '../data/takeout.json');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363411442434414@newsletter',
            newsletterName: 'Alson XMD BOTS',
            serverMessageId: -1
        }
    }
};

// Load game state
function loadGame() {
    try {
        if (fs.existsSync(GAME_FILE)) {
            return JSON.parse(fs.readFileSync(GAME_FILE, 'utf8'));
        }
    } catch (e) {}
    return { active: false, players: [], eliminated: [], chatId: null };
}

// Save game state
function saveGame(game) {
    try {
        const dir = path.dirname(GAME_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(GAME_FILE, JSON.stringify(game, null, 2));
    } catch (e) {}
}

// Clear game
function clearGame() {
    try {
        if (fs.existsSync(GAME_FILE)) {
            fs.unlinkSync(GAME_FILE);
        }
    } catch (e) {}
}

// Get player name
function getPlayerName(sock, jid) {
    try {
        const name = sock.getName(jid);
        return name.split('@')[0];
    } catch {
        return jid.split('@')[0];
    }
}

async function takeoutCommand(sock, chatId, message) {
    try {
        const userMessage = message.message?.conversation?.trim() || 
                          message.message?.extendedTextMessage?.text?.trim() || '';
        const args = userMessage.split(' ').slice(1);
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) {
            await sock.sendMessage(chatId, {
                text: `❌ *TAKEOUT GAME*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 This command only works in groups!`,
                ...channelInfo
            });
            return;
        }
        
        let game = loadGame();
        
        // Command: .takeout start
        if (args[0] === 'start') {
            if (game.active && game.chatId === chatId) {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *GAME IN PROGRESS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 A game is already running!\n└ Use .takeout end to stop it.`,
                    ...channelInfo
                });
                return;
            }
            
            // Get all group members
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            
            // Get bot's JID and owner's JID
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const ownerNumber = settings.ownerNumber;
            const ownerJid = ownerNumber + '@s.whatsapp.net';
            
            // Filter out bot and bot owner from players
            const players = participants
                .filter(p => p.id !== botJid)  // Exclude bot itself
                .filter(p => p.id !== ownerJid)  // Exclude bot owner
                .map(p => ({
                    jid: p.id,
                    name: getPlayerName(sock, p.id)
                }));
            
            if (players.length < 2) {
                await sock.sendMessage(chatId, {
                    text: `❌ *NOT ENOUGH PLAYERS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Need at least 2 players to start!\n└ Bot and Bot Owner are automatically excluded.`,
                    ...channelInfo
                });
                return;
            }
            
            game = {
                active: true,
                players: players,
                eliminated: [],
                chatId: chatId,
                round: 0
            };
            saveGame(game);
            
            let playerList = '';
            players.forEach((p, i) => {
                playerList += `${i + 1}. @${p.name}\n`;
            });
            
            await sock.sendMessage(chatId, {
                text: `🎮 *TAKEOUT GAME STARTED!* 🎮\n\n━━━━━━━━━━━━━━━━━━━━\n👥 *Players (${players.length}):*\n${playerList}\n\n━━━━━━━━━━━━━━━━━━━━\n📖 *Commands:*\n└ .takeout - Eliminate 1 random player\n└ .takeout 2 - Eliminate 2 random players\n└ .takeout all - Eliminate half the players\n└ .takeout status - Show game status\n└ .takeout end - End the game\n\n━━━━━━━━━━━━━━━━━━━━\n🎯 Last player standing wins!\n\n━━━━━━━━━━━━━━━━━━━━\n🤖 *Note:* Bot and Bot Owner are not playing.`,
                mentions: players.map(p => p.jid),
                ...channelInfo
            });
            return;
        }
        
        // Command: .takeout end
        if (args[0] === 'end') {
            if (!game.active || game.chatId !== chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ *NO ACTIVE GAME*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Start a game with .takeout start`,
                    ...channelInfo
                });
                return;
            }
            
            clearGame();
            await sock.sendMessage(chatId, {
                text: `🏁 *GAME ENDED* 🏁\n\n━━━━━━━━━━━━━━━━━━━━\n📌 The game has been ended.`,
                ...channelInfo
            });
            return;
        }
        
        // Command: .takeout status
        if (args[0] === 'status') {
            if (!game.active || game.chatId !== chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ *NO ACTIVE GAME*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Start a game with .takeout start`,
                    ...channelInfo
                });
                return;
            }
            
            let activeList = '';
            game.players.forEach((p, i) => {
                activeList += `${i + 1}. @${p.name}\n`;
            });
            
            let eliminatedList = '';
            if (game.eliminated.length > 0) {
                game.eliminated.forEach((p, i) => {
                    eliminatedList += `${i + 1}. @${p.name}\n`;
                });
            } else {
                eliminatedList = '└ None yet\n';
            }
            
            await sock.sendMessage(chatId, {
                text: `📊 *TAKEOUT GAME STATUS*\n\n━━━━━━━━━━━━━━━━━━━━\n🎯 *Active Players (${game.players.length}):*\n${activeList}\n━━━━━━━━━━━━━━━━━━━━\n💀 *Eliminated (${game.eliminated.length}):*\n${eliminatedList}\n━━━━━━━━━━━━━━━━━━━━\n🎮 Round: ${game.round}\n└ Type .takeout to eliminate someone!`,
                mentions: [...game.players.map(p => p.jid), ...game.eliminated.map(p => p.jid)],
                ...channelInfo
            });
            return;
        }
        
        // Command: .takeout (eliminate players)
        if (!game.active || game.chatId !== chatId) {
            await sock.sendMessage(chatId, {
                text: `❌ *NO ACTIVE GAME*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Start a game with .takeout start`,
                ...channelInfo
            });
            return;
        }
        
        if (game.players.length <= 1) {
            const winner = game.players[0];
            await sock.sendMessage(chatId, {
                text: `🏆 *GAME OVER - WINNER!* 🏆\n\n━━━━━━━━━━━━━━━━━━━━\n🎉 Congratulations @${winner.name}!\n\n━━━━━━━━━━━━━━━━━━━━\n👑 You are the last player standing!\n\n━━━━━━━━━━━━━━━━━━━━\n🎮 Type .takeout start to play again!`,
                mentions: [winner.jid],
                ...channelInfo
            });
            clearGame();
            return;
        }
        
        // Determine how many to eliminate
        let eliminateCount = 1;
        if (args[0] && !isNaN(parseInt(args[0]))) {
            eliminateCount = Math.min(parseInt(args[0]), game.players.length - 1);
            if (eliminateCount < 1) eliminateCount = 1;
        } else if (args[0] === 'all') {
            eliminateCount = Math.floor(game.players.length / 2);
            if (eliminateCount < 1) eliminateCount = 1;
        }
        
        // Randomly select players to eliminate
        const shuffled = [...game.players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const eliminated = shuffled.slice(0, eliminateCount);
        const remaining = shuffled.slice(eliminateCount);
        
        // Update game
        game.eliminated.push(...eliminated);
        game.players = remaining;
        game.round++;
        saveGame(game);
        
        // Create elimination message
        let eliminatedList = '';
        eliminated.forEach(p => {
            eliminatedList += `└ @${p.name} 💀\n`;
        });
        
        let remainingList = '';
        remaining.forEach((p, i) => {
            remainingList += `${i + 1}. @${p.name}\n`;
        });
        
        await sock.sendMessage(chatId, {
            text: `🎲 *TAKEOUT ROUND ${game.round}* 🎲\n\n━━━━━━━━━━━━━━━━━━━━\n💀 *Eliminated (${eliminated.length}):*\n${eliminatedList}\n━━━━━━━━━━━━━━━━━━━━\n🎯 *Remaining (${remaining.length}):*\n${remainingList}\n━━━━━━━━━━━━━━━━━━━━\n${remaining.length === 1 ? '🏆 ONE PLAYER LEFT! Next .takeout will declare winner!' : '📌 Type .takeout to eliminate more!'}`,
            mentions: [...eliminated.map(p => p.jid), ...remaining.map(p => p.jid)],
            ...channelInfo
        });
        
        // Check if game ended
        if (remaining.length === 1) {
            const winner = remaining[0];
            await sock.sendMessage(chatId, {
                text: `🏆 *GAME OVER - WINNER!* 🏆\n\n━━━━━━━━━━━━━━━━━━━━\n🎉 Congratulations @${winner.name}!\n\n━━━━━━━━━━━━━━━━━━━━\n👑 You survived the takeout game!\n\n━━━━━━━━━━━━━━━━━━━━\n🎮 Type .takeout start to play again!`,
                mentions: [winner.jid],
                ...channelInfo
            });
            clearGame();
        }
        
    } catch (error) {
        console.error('Error in takeout command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *ERROR*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Something went wrong. Try .takeout start again.`,
            ...channelInfo
        });
    }
}

module.exports = takeoutCommand;
