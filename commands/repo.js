const githubCommand = require('./github');

async function repoCommand(sock, chatId, message) {
  return githubCommand(sock, chatId, message);
}

module.exports = repoCommand;
