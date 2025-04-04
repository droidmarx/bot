import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Lista temporária de usuários (não persiste entre deploys)
let authorizedUsers = [];

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    const message = update.message;

    if (message) {
      const chatId = message.chat.id;
      const text = message.text;

      if (text === '/command2') {
        if (!authorizedUsers.includes(chatId)) {
          authorizedUsers.push(chatId);
          await bot.telegram.sendMessage(chatId, 'Você agora receberá notificações!');
        } else {
          await bot.telegram.sendMessage(chatId, 'Você já está recebendo notificações.');
        }
      } else {
        await Promise.all(
          authorizedUsers.map(user =>
            bot.telegram.sendMessage(user, `Nova mensagem: ${text}`)
          )
        );
      }
    }

    res.status(200).send('OK');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}