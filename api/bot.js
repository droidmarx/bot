import { Telegraf } from 'telegraf';
import fs from 'fs';
import express from 'express';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

const USERS_FILE = 'users.json';

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}

let authorizedUsers = loadUsers();

app.get('/', (req, res) => {
  res.send('Bot rodando!');
});

app.post(`/${process.env.TELEGRAM_TOKEN}`, async (req, res) => {
  const update = req.body;
  const message = update.message;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/command2') {
      if (!authorizedUsers.includes(chatId)) {
        authorizedUsers.push(chatId);
        saveUsers(authorizedUsers);
        await bot.telegram.sendMessage(chatId, 'Você agora receberá notificações!');
      } else {
        await bot.telegram.sendMessage(chatId, 'Você já está recebendo notificações.');
      }
    } else {
      for (const user of authorizedUsers) {
        await bot.telegram.sendMessage(user, text);
      }
    }
  }

  res.sendStatus(200);
});

export default app;
