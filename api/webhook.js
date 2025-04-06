// pages/api/webhook.js
import fetch from 'node-fetch';

const API_URL = "https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users";

async function isUserRegistered(chatId) {
  const response = await fetch(API_URL);
  const users = await response.json();
  return users.some(user => user.chatId === chatId.toString());
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

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
        await sendTelegramMessage(chatId, `Registrado com sucesso, ${username}!`);
      } else {
        await sendTelegramMessage(chatId, 'Você já está registrado!');
      }
    }
  }

  res.status(200).send('OK');
}

// Função para enviar mensagem
async function sendTelegramMessage(chatId, text) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}