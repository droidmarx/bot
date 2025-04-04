import { Telegraf } from 'telegraf';
import express from 'express';
import fetch from 'node-fetch';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();
app.use(express.json());

const API_URL = "https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users";

// Função para verificar se o usuário já está cadastrado
async function isUserRegistered(chatId) {
  const response = await fetch(API_URL);
  const users = await response.json();
  return users.some(user => user.chatId === chatId.toString());
}

// Função para cadastrar o usuário no MockAPI
async function registerUser(chatId, username) {
  await fetch(API_URL, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId: chatId.toString(),
      username: username || "Usuário desconhecido"
    })
  });
}

app.post(`/${process.env.TELEGRAM_TOKEN}`, async (req, res) => {
  const update = req.body;
  const message = update.message;

  if (message) {
    const chatId = message.chat.id;
    const text = message.text;
    const username = message.from?.first_name || "Usuário";

    if (text === '/command2') {
      const alreadyRegistered = await isUserRegistered(chatId);

      if (!alreadyRegistered) {
        await registerUser(chatId, username);
        await bot.telegram.sendMessage(chatId, `Registrado com sucesso, ${username}!`);
      } else {
        await bot.telegram.sendMessage(chatId, 'Você já está registrado!');
      }
    }
  }

  res.sendStatus(200);
});

// Define o Webhook
bot.telegram.setWebhook(`https://bot-nine-gray.vercel.app/${process.env.TELEGRAM_TOKEN}`);

export default app;