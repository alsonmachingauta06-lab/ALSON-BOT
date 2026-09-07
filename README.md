  # 🤖 Alson-Bot

<p align="center">
  <img src="assets/bot_image.jpg" width="300" alt="Alson-Bot">
</p>

<p align="center">
  <b>🚀 Alson-Bot — WhatsApp Multi-Device Bot</b>
</p>

<p align="center">
  Powerful • Fast • Easy to Use
</p>

<div align="center">🚀 Alson-Bot — WhatsApp Multi-Device Bot

A powerful and easy-to-use WhatsApp bot built with Node.js and Baileys.

Owner: Alson Machingauta

</div>---

✨ Features

- 🤖 AI Chatbot
- 🎵 Music commands
- 📥 Media tools
- 👥 Group management
- 🛠️ Owner commands
- 🖼️ Bot profile picture control
- ⚡ Fast WhatsApp pairing
- 🔄 Automatic reconnection
- 📱 Works with Android + Termux
- 🚫 No prefix required for supported commands

---

📢 Official WhatsApp Channel

Join the official Alson-Bot channel for updates, announcements and new features:

👉 https://whatsapp.com/channel/0029Vb8pa9p5kg7CkpkxrR37

---

📲 Installation

1. Install Termux

Download Termux from the official F-Droid source:

https://f-droid.org/packages/com.termux/

«⚠️ Avoid downloading Termux from random websites.»

---

2. Update Termux

Open Termux and run:

pkg update && pkg upgrade -y

---

3. Install Node.js and Git

pkg install nodejs git -y

Check that they installed correctly:

node -v
git --version

---

📥 Download Alson-Bot

Clone the repository:

git clone https://github.com/alsonmachingauta06-lab/Alson-Bot.git

Enter the bot folder:

cd Alson-Bot

Install dependencies:

npm install

---

🔐 WhatsApp Pairing

Start the bot:

npm start

or:

node index.js

The bot will provide a pairing code.

On your WhatsApp:

WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead

Enter the pairing code shown by Alson-Bot.

After successful pairing, the bot will connect automatically.

---

▶️ Start the Bot

Whenever you want to start Alson-Bot:

cd ~/Alson-Bot
npm start

If "npm start" isn't configured, use:

node index.js

---

💬 Chatbot

Alson-Bot includes an AI chatbot.

Simply send a normal message in a supported chat and the bot can respond automatically.

Example:

Hi

Hey! 👋 How’s everyone doing?

---

👥 Group Usage

Add the bot to your WhatsApp group and use the supported commands.

Some commands may require:

- 👑 Owner permissions
- 🛡️ Admin permissions
- 👥 Group permissions

---

👑 Owner

Owner: Alson Machingauta

Owner-only commands are protected and cannot be used by ordinary users.

---

🖼️ Bot Profile Picture

The owner can use the bot's profile-picture command where supported:

setbotpp

Follow the bot's instructions to set a new profile picture.

---

🛠️ Troubleshooting

Bot doesn't start

Try:

cd ~/Alson-Bot
npm install
node index.js

---

Pairing code doesn't work

Make sure:

1. WhatsApp is connected to the internet.
2. You enter the code quickly.
3. WhatsApp is updated.
4. You don't already have too many linked devices.
5. The bot is running while you enter the code.

You can also check your linked devices:

WhatsApp → Settings → Linked Devices

---

Dependencies are missing

Run:

npm install

Then restart:

node index.js

---

🔒 Security

Never publish private credentials, session files, API keys, tokens, or passwords in this repository.

Do NOT upload:

.env
auth_info/
session/
creds.json
config.json

if they contain private credentials.

If you accidentally expose a secret, revoke it and generate a new one.

---

⚠️ Disclaimer

Alson-Bot is provided for educational and personal automation purposes.

Use the bot responsibly and follow WhatsApp's Terms of Service.

The developer is not responsible for misuse of the bot or for accounts restricted because of user activity.

---

❤️ Credits

Alson-Bot

Developed and maintained by:

Alson Machingauta

📢 Official WhatsApp Channel:

https://whatsapp.com/channel/0029Vb8pa9p5kg7CkpkxrR37

---

⭐ Support

If you like Alson-Bot, consider giving the repository a ⭐ on GitHub and joining the WhatsApp channel for updates.

Powered by Alson Machingauta
