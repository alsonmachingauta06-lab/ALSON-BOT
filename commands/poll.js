/**
 * Alson XMD - A WhatsApp Bot
 * Poll Command - Create polls in WhatsApp groups
 */

const fs = require('fs');
const path = require('path');

// Channel info for professional branding
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

// Store active polls
const POLLS_FILE = path.join(__dirname, '../data/polls.json');

// Initialize polls file
function initPolls() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(POLLS_FILE)) {
        fs.writeFileSync(POLLS_FILE, JSON.stringify({ polls: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(POLLS_FILE, 'utf8'));
}

// Save polls data
function savePolls(data) {
    fs.writeFileSync(POLLS_FILE, JSON.stringify(data, null, 2));
}

// Create poll
async function createPoll(sock, chatId, question, options, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `❌ *GROUPS ONLY*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Polls can only be created in WhatsApp groups.`,
                ...channelInfo
            });
            return;
        }

        if (options.length < 2) {
            await sock.sendMessage(chatId, {
                text: `❌ *INVALID OPTIONS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Poll must have at least 2 options.`,
                ...channelInfo
            });
            return;
        }

        if (options.length > 10) {
            await sock.sendMessage(chatId, {
                text: `❌ *TOO MANY OPTIONS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Poll can have maximum 10 options.`,
                ...channelInfo
            });
            return;
        }

        // Create poll message
        let pollMessage = `📊 *NEW POLL CREATED* 📊\n\n`;
        pollMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        pollMessage += `📝 *Question:*\n└ ${question}\n\n`;
        pollMessage += `📋 *Options:*\n`;
        
        options.forEach((option, index) => {
            pollMessage += `└ ${index + 1}️⃣ ${option}\n`;
        });

        pollMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        pollMessage += `🎯 *How to vote:*\n`;
        pollMessage += `└ Reply with .vote <number>\n`;
        pollMessage += `└ Example: .vote 1\n\n`;
        pollMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        pollMessage += `📊 *Other commands:*\n`;
        pollMessage += `└ .poll results - View current results\n`;
        pollMessage += `└ .poll end - Close this poll\n\n`;
        pollMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        pollMessage += `🤖 *Powered by Alson XMD*`;

        // Create poll data
        const pollId = Date.now().toString();
        const pollsData = initPolls();
        
        pollsData.polls[pollId] = {
            question,
            options: options.map((opt, index) => ({
                text: opt,
                number: index + 1,
                votes: 0,
                voters: []
            })),
            createdBy: message.key.participant || message.key.remoteJid,
            chatId,
            createdAt: new Date().toISOString(),
            isActive: true,
            totalVotes: 0
        };

        savePolls(pollsData);

        await sock.sendMessage(chatId, { text: pollMessage, ...channelInfo });
        console.log(`✅ Poll created: ${pollId}`);

    } catch (error) {
        console.error('Error creating poll:', error);
        throw error;
    }
}

// Vote in poll
async function voteInPoll(sock, chatId, pollNumber, voterId, message) {
    try {
        const pollsData = initPolls();
        const activePolls = Object.entries(pollsData.polls).filter(([_, poll]) => 
            poll.chatId === chatId && poll.isActive
        );

        if (activePolls.length === 0) {
            await sock.sendMessage(chatId, {
                text: `❌ *NO ACTIVE POLLS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 No active polls in this group.\n\n💡 Use .poll create to start a new poll.`,
                ...channelInfo
            });
            return;
        }

        const [pollId, poll] = activePolls[activePolls.length - 1];
        const optionIndex = poll.options.findIndex(opt => opt.number === pollNumber);

        if (optionIndex === -1) {
            await sock.sendMessage(chatId, {
                text: `❌ *INVALID OPTION*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Valid options: ${poll.options.map(opt => opt.number).join(', ')}`,
                ...channelInfo
            });
            return;
        }

        const hasVoted = poll.options.some(opt => opt.voters.includes(voterId));
        if (hasVoted) {
            await sock.sendMessage(chatId, {
                text: `❌ *ALREADY VOTED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 You have already voted in this poll.`,
                ...channelInfo
            });
            return;
        }

        // Remove from previous vote if any (for vote change)
        poll.options.forEach(opt => {
            const voterIndex = opt.voters.indexOf(voterId);
            if (voterIndex > -1) {
                opt.voters.splice(voterIndex, 1);
                opt.votes--;
                poll.totalVotes--;
            }
        });

        poll.options[optionIndex].votes++;
        poll.options[optionIndex].voters.push(voterId);
        poll.totalVotes++;

        savePolls(pollsData);

        await sock.sendMessage(chatId, {
            text: `✅ *VOTE RECORDED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 You voted for option ${pollNumber}: ${poll.options[optionIndex].text}\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Use .poll results to see current standings.`,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error voting:', error);
        throw error;
    }
}

// Show poll results
async function showPollResults(sock, chatId) {
    try {
        const pollsData = initPolls();
        const activePolls = Object.entries(pollsData.polls).filter(([_, poll]) => 
            poll.chatId === chatId && poll.isActive
        );

        if (activePolls.length === 0) {
            await sock.sendMessage(chatId, {
                text: `❌ *NO ACTIVE POLLS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 No active polls in this group.`,
                ...channelInfo
            });
            return;
        }

        const [pollId, poll] = activePolls[activePolls.length - 1];
        
        let resultsMessage = `📊 *POLL RESULTS* 📊\n\n`;
        resultsMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        resultsMessage += `📝 *Question:*\n└ ${poll.question}\n\n`;
        resultsMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        resultsMessage += `📊 *Results:*\n`;

        poll.options.forEach(option => {
            const percentage = poll.totalVotes > 0 
                ? Math.round((option.votes / poll.totalVotes) * 100) 
                : 0;
            
            const barLength = Math.round(percentage / 5);
            const bars = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
            
            resultsMessage += `\n└ ${option.number}️⃣ ${option.text}\n`;
            resultsMessage += `   ${bars} ${percentage}% (${option.votes} votes)\n`;
        });

        resultsMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        resultsMessage += `📊 *Total Votes:* ${poll.totalVotes}\n`;
        resultsMessage += `🆔 *Poll ID:* ${pollId}\n`;
        resultsMessage += `📌 *Status:* ${poll.isActive ? '🟢 Active' : '🔴 Closed'}\n`;
        resultsMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        resultsMessage += `💡 Use .vote <number> to vote!`;

        await sock.sendMessage(chatId, { text: resultsMessage, ...channelInfo });

    } catch (error) {
        console.error('Error showing results:', error);
        throw error;
    }
}

// End poll
async function endPoll(sock, chatId, enderId) {
    try {
        const pollsData = initPolls();
        const activePolls = Object.entries(pollsData.polls).filter(([_, poll]) => 
            poll.chatId === chatId && poll.isActive
        );

        if (activePolls.length === 0) {
            await sock.sendMessage(chatId, {
                text: `❌ *NO ACTIVE POLLS*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 No active polls to end.`,
                ...channelInfo
            });
            return;
        }

        const [pollId, poll] = activePolls[activePolls.length - 1];

        if (poll.createdBy !== enderId) {
            await sock.sendMessage(chatId, {
                text: `❌ *PERMISSION DENIED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Only the poll creator can end this poll.`,
                ...channelInfo
            });
            return;
        }

        poll.isActive = false;
        savePolls(pollsData);

        const winner = poll.options.reduce((prev, current) => 
            (prev.votes > current.votes) ? prev : current
        );

        let endMessage = `🏁 *POLL ENDED* 🏁\n\n`;
        endMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        endMessage += `📝 *Question:*\n└ ${poll.question}\n\n`;
        endMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        endMessage += `🏆 *WINNER:*\n└ Option ${winner.number} - ${winner.text}\n└ Votes: ${winner.votes}\n\n`;
        endMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        endMessage += `📊 *Final Results:*\n`;

        poll.options.forEach(option => {
            const percentage = poll.totalVotes > 0 
                ? Math.round((option.votes / poll.totalVotes) * 100) 
                : 0;
            endMessage += `└ ${option.number}️⃣ ${option.text}: ${percentage}% (${option.votes} votes)\n`;
        });

        endMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        endMessage += `📊 *Total Votes:* ${poll.totalVotes}\n`;
        endMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        endMessage += `🤖 *Poll closed by poll creator*`;

        await sock.sendMessage(chatId, { text: endMessage, ...channelInfo });

    } catch (error) {
        console.error('Error ending poll:', error);
        throw error;
    }
}

// Main poll command
async function pollCommand(sock, chatId, message) {
    try {
        const userMessage = message.message?.conversation?.trim() || 
                          message.message?.extendedTextMessage?.text?.trim() || '';
        const args = userMessage.split(' ').slice(1);
        const senderId = message.key.participant || message.key.remoteJid;

        if (args.length === 0) {
            await sock.sendMessage(chatId, {
                text: `📊 *POLL SYSTEM* 📊\n\n━━━━━━━━━━━━━━━━━━━━\n📖 *Commands:*\n└ .poll create "Question" | Option1 | Option2\n└ .vote <number> - Vote in active poll\n└ .poll results - Show current results\n└ .poll end - End active poll\n└ .poll help - Show this menu\n\n━━━━━━━━━━━━━━━━━━━━\n✨ *Example:*\n└ .poll create "Best language?" | JS | Python | Java\n└ .vote 2\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *Note:* Polls only work in groups!`,
                ...channelInfo
            });
            return;
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'create':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: `❌ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .poll create "Question" | Option1 | Option2 | Option3\n\n✨ *Example:*\n└ .poll create "Favorite color?" | Red | Blue | Green`,
                        ...channelInfo
                    });
                    return;
                }

                const pollText = args.slice(1).join(' ');
                const parts = pollText.split('|').map(part => part.trim());
                
                if (parts.length < 3) {
                    await sock.sendMessage(chatId, {
                        text: `❌ *INVALID FORMAT*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 Format: .poll create "Question" | Option1 | Option2 | ...\n📌 Minimum 2 options required.`,
                        ...channelInfo
                    });
                    return;
                }

                const question = parts[0].replace(/["']/g, '');
                const options = parts.slice(1);

                await createPoll(sock, chatId, question, options, message);
                break;

            case 'results':
                await showPollResults(sock, chatId);
                break;

            case 'end':
                await endPoll(sock, chatId, senderId);
                break;

            case 'help':
                await sock.sendMessage(chatId, {
                    text: `🆘 *POLL HELP* 🆘\n\n━━━━━━━━━━━━━━━━━━━━\n📖 *Create Poll:*\n└ .poll create "Question?" | Option1 | Option2\n\n━━━━━━━━━━━━━━━━━━━━\n🎯 *Vote:*\n└ .vote <number>\n\n━━━━━━━━━━━━━━━━━━━━\n📊 *View Results:*\n└ .poll results\n\n━━━━━━━━━━━━━━━━━━━━\n🏁 *End Poll:*\n└ .poll end (creator only)\n\n━━━━━━━━━━━━━━━━━━━━\n✨ *Full Example:*\n1️⃣ .poll create "Best color?" | Red | Blue | Green\n2️⃣ .vote 2\n3️⃣ .poll results\n4️⃣ .poll end`,
                    ...channelInfo
                });
                break;

            default:
                await sock.sendMessage(chatId, {
                    text: `⚠️ *INVALID COMMAND*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 Use .poll help for available commands.`,
                    ...channelInfo
                });
                break;
        }

    } catch (error) {
        console.error('Error in poll command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *ERROR*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Failed to process poll command.\n\n💡 Please try again.`,
            ...channelInfo
        });
    }
}

// Vote command
async function voteCommand(sock, chatId, message) {
    try {
        const userMessage = message.message?.conversation?.trim() || 
                          message.message?.extendedTextMessage?.text?.trim() || '';
        const args = userMessage.split(' ').slice(1);
        const senderId = message.key.participant || message.key.remoteJid;

        if (args.length === 0) {
            await sock.sendMessage(chatId, {
                text: `🎯 *VOTE COMMAND*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 Usage: .vote <option-number>\n\n✨ *Example:*\n└ .vote 2\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Use .poll results to see options.`,
                ...channelInfo
            });
            return;
        }

        const voteNumber = parseInt(args[0]);
        
        if (isNaN(voteNumber) || voteNumber < 1) {
            await sock.sendMessage(chatId, {
                text: `❌ *INVALID NUMBER*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 Please provide a valid option number.\n\n✨ *Example:* .vote 2`,
                ...channelInfo
            });
            return;
        }

        await voteInPoll(sock, chatId, voteNumber, senderId, message);

    } catch (error) {
        console.error('Error in vote command:', error);
        await sock.sendMessage(chatId, {
            text: `❌ *ERROR*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Failed to process vote.\n\n💡 Please try again.`,
            ...channelInfo
        });
    }
}

module.exports = {
    pollCommand,
    voteCommand
};
