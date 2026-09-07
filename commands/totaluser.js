//════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════//
//                                                                                                                                                                                        //
//                                                             𝐖𝐀𝐋𝐋𝐘𝐉𝐀𝐘𝐓𝐄𝐂𝐇-𝐌𝐃 𝐁𝐎𝐓                                                                                                     //
//                                                                                                                                                                                        //
//                                                                  𝐕 : 1.0.0                                                                                                             //
//                                                                                                                                                                                        //
//                                                                                                                                                                                        //
//                ██╗    ██╗ █████╗ ██╗     ██╗  ██╗   ██╗   ██╗ █████╗ ██╗   ██╗████████╗███████╗ ██████╗██╗  ██╗      ███╗   ███╗██████╗                                 //
//                ██║    ██║██╔══██╗██║     ██║  ╚██╗ ██╔╝   ██║██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝██╔════╝██║  ██║      ████╗ ████║██╔══██╗                              //
//                ██║ █╗ ██║███████║██║     ██║   ╚████╔╝    ██║███████║ ╚████╔╝    ██║   █████╗  ██║     ███████║█████╗██╔████╔██║██║  ██║                               //
//                ██║███╗██║██╔══██║██║     ██║    ╚██╔╝██   ██║██╔══██║  ╚██╔╝     ██║   ██╔══╝  ██║     ██╔══██║╚════╝██║╚██╔╝██║██║  ██║                               //
//                ╚███╔███╔╝██║  ██║███████╗███████╗██║ ╚█████╔╝██║  ██║   ██║      ██║   ███████╗╚██████╗██║  ██║      ██║ ╚═╝ ██║██████╔╝                              //
//                 ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚════╝ ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝      ╚═╝     ╚═╝╚═════╝                                 //
//                                                                                                                                                                                        //
//                                                                 𝐂𝐎𝐏𝐘𝐑𝐈𝐆𝐇𝐓 2025                                                                                                        //
//                                                                                                                                                                                        //
//                                                                                                                                                                                        //
//════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════//
//* 
//  * project_name : Alson XMD
//  * author : AlsonMachingauta
//  * youtube : https://www.youtube.com/AlsonMachingautay
//  * description : Alson XMD ,A Multi-Device whatsapp user bot.
//*
//*
//re-upload? recode? copy code? give credit to AlsonMachingauta 2025:)
//Instagram: AlsonMachingauta
//Telegram: t.me/AlsonMachingauta
//GitHub: AlsonMachingautah
//WhatsApp: +263786359833
//want more free bot scripts? subscribe to my youtube channel: https://youtube.com/@AlsonMachingautay
//   * Created By Github: AlsonMachingautah.
//   * Credit To ally jay tech
//   * © 2025 Alson XMD.
// ⛥┌┤
// */

const fetch = require('node-fetch');

const PROXY_URL = 'https://gemini-proxy-10a1.onrender.com';

async function totalUsersCommand(sock, chatId, message) {
    try {
        const senderNumber = (message.key.remoteJidAlt || message.key.participant || message.key.remoteJid).split('@')[0].split(':')[0];
        console.log('Sender number:', senderNumber);
        const res = await fetch(`${PROXY_URL}/v1/admin/users`, {
            headers: { 'x-user-number': senderNumber }
        });

        if (res.status === 401) {
            return sock.sendMessage(chatId, {
                text: `╭──◆「 *ADMIN ONLY* 」◆\n├\n├◇ ❌ Developer access only\n├\n╰─┬─★─☆─♪♪─◆\n\n╭──◆「 *Alson XMD* 」◆\n╰───★─☆─♪♪─◆`
            }, { quoted: message });
        }

        const data = await res.json();
        const inactiveCount = data.totalUsers - data.activeUsers;

        let msg = `╭──◆「 *USER STATS* 」◆\n├\n`;
        msg += `├◇ 📊 Total Users: ${data.totalUsers}\n`;
        msg += `├◇ 🟢 Active Now: ${data.activeUsers}\n`;
        msg += `├◇ 🔴 Inactive: ${inactiveCount}\n`;
        msg += `├\n├◇ *All Users:*\n`;

        for (const u of data.users) {
            const icon = u.isOnline ? '🟢' : '🔴';
            msg += `├◇ ${icon} ${u.userId}\n`;
        }

        msg += `├\n╰─┬─★─☆─♪♪─◆\n\n╭──◆「 *Alson XMD* 」◆\n╰───★─☆─♪♪─◆`;

        await sock.sendMessage(chatId, { text: msg }, { quoted: message });

    } catch (error) {
        await sock.sendMessage(chatId, {
            text: `╭──◆「 *ERROR* 」◆\n├\n├◇ ❌ Failed to fetch stats\n├\n╰─┬─★─☆─♪♪─◆\n\n╭──◆「 *Alson XMD* 」◆\n╰───★─☆─♪♪─◆`
        }, { quoted: message });
    }
}

module.exports = totalUsersCommand;
