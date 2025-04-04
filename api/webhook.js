const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';

let awaitingName = {};

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const update = req.body;
  const message = update?.message;
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;

  // 1. Esperando nome após comando /nome
  if (awaitingName[chatId]) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, nome: text })
      });

      delete awaitingName[chatId];
      await sendMessage(chatId, 'Registrado com sucesso!');
      return res.status(200).send('Nome salvo');
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao registrar seu nome.');
    }
  }

  // 2. Comandos principais
  switch (text) {
    case '/start':
      await sendMessage(chatId, 'Seja muito bem vindo !');
      break;

    case '/command1':
      await sendMessage(chatId, 'https://estoque-control.vercel.app/');
      break;

    case '/command2':
      try {
        const resp = await fetch(`${API_URL}?chatId=${chatId}`);
        const existing = await resp.json();

        if (existing.length === 0) {
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId })
          });
          await sendMessage(chatId, 'Você agora receberá notificações!');
        } else {
          await sendMessage(chatId, 'Você já está recebendo notificações.');
        }
      } catch (err) {
        console.error(err);
        await sendMessage(chatId, 'Erro ao cadastrar usuário.');
      }
      break;

    case '/nome':
      awaitingName[chatId] = true;
      await sendMessage(chatId, 'Qual o seu nome?');
      break;

    default:
      // Encaminhar mensagem se for do admin
      if (chatId === 5759760387) {
        try {
          const resp = await fetch(API_URL);
          const users = await resp.json();

          await Promise.all(users.map(user => sendMessage(user.chatId, text)));
        } catch (err) {
          console.error('Erro ao enviar para todos:', err);
        }
      }
      break;
  }

  res.status(200).send('OK');
}

// Envia mensagem para o Telegram
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}