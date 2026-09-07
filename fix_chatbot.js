const fs = require('fs');

const file = 'main.js';
let code = fs.readFileSync(file, 'utf8');

const start = code.indexOf('// Check if message is a command');
const end = code.indexOf('// If we get here, it\'s a command');

if (start === -1 || end === -1) {
    console.error('❌ Could not find the chatbot section.');
    process.exit(1);
}

const replacement = `// Check if message is a command
let isCommand = false;
let commandWithoutPrefix = '';

const trimmedText = rawMessageText.trim();

// Normal prefixed command
if (currentPrefix && trimmedText.startsWith(currentPrefix)) {
    isCommand = true;
    commandWithoutPrefix = trimmedText.slice(currentPrefix.length).trim();
}

// Dot commands always remain supported
else if (trimmedText.startsWith('.')) {
    isCommand = true;
    commandWithoutPrefix = trimmedText.slice(1).trim();
}

// No-prefix mode
// Only treat the message as a command if the FIRST WORD
// resolves to a real registered command.
else if (currentPrefix === '' && trimmedText) {
    const firstWord = trimmedText.split(/\\\\s+/)[0];
    const resolvedFirst = resolveCommand(firstWord);

    if (resolvedFirst && resolvedFirst !== firstWord.toLowerCase()) {
        isCommand = true;
        commandWithoutPrefix = trimmedText;
    }
}

// Handle normal messages
if (!isCommand) {
    if (rawMessageText.trim()) {

        if (isGroup) {
            await Antilink(message, sock);
        }

        await handleAutorecordForMessage(
            sock,
            chatId,
            rawMessageText,
            message
        );

        await handleAutotypingForMessage(
            sock,
            chatId,
            rawMessageText,
            message
        );

        // Chatbot works in DMs, groups and status
        await handleChatbotResponse(
            sock,
            chatId,
            message,
            rawMessageText,
            senderId
        );
    }

    return;
}

`;

code = code.slice(0, start) + replacement + code.slice(end);

fs.writeFileSync(file, code);

console.log('✅ Chatbot/no-prefix section patched successfully.');
