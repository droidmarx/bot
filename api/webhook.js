const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';

let awaitingData = {}; // Armazena estado do registro

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

  // 🔹 Encaminhamento de mensagens do bot para os usuários cadastrados
  if (chatId === 5759760387) {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();

      if (!users.length) {
        console.log('Nenhum usuário registrado.');
        return res.status(200).send('Nenhum usuário registrado.');
      }

      console.log(`Encaminhando mensagem para ${users.length} usuários.`);
      await Promise.all(users.map(user => sendMessage(user.chatId, text)));
      
      return res.status(200).send('Mensagem enviada para todos');
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      return res.status(500).send('Erro ao encaminhar mensagem');
    }
  }

  // 🔹 Remove notificações do usuário
  if (text === 'command3') {
    try {
      const resp = await fetch(`${API_URL}?chatId=${chatId}`);
      const users = await resp.json();

      if (users.length > 0) {
        const userId = users[0].id;
        await fetch(`${API_URL}/${userId}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Registro removido, você não receberá mais notificações!');
      } else {
        await sendMessage(chatId, 'Você já foi removido das notificações ou não estava cadastrado.');
      }
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      await sendMessage(chatId, 'Ocorreu um erro ao processar sua solicitação.');
    }
    return res.status(200).send('Remoção processada');
  }

  // 🔹 Fluxo de registro interativo
  if (awaitingData[chatId]) {
    const userData = awaitingData[chatId];

    if (!userData.name) {
      awaitingData[chatId].name = text;
      await sendMessage(chatId, 'Agora, informe seu sobrenome:');
    } else if (!userData.surname) {
      awaitingData[chatId].surname = text;
      await sendMessage(chatId, 'Por fim, informe seu número de celular:');
    } else {
      awaitingData[chatId].phone = text;

      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            name: `${userData.name} ${userData.surname}`,
            phone: userData.phone
          })
        });

        delete awaitingData[chatId];
        await sendMessage(chatId, 'Registrado com sucesso! Agora você receberá notificações.');
      } catch (err) {
        console.error(err);
        await sendMessage(chatId, 'Erro ao registrar seus dados.');
      }
    }
    return res.status(200).send('Registro processado');
  }

  // 🔹 Comandos básicos
  switch (text) {
    case '/start':
      await sendMessage(chatId, 'Seja muito bem-vindo!');
      break;

    case '/command1':
      await sendMessage(chatId, 'https://estoque-control.vercel.app/');
      break;

    case '/command2':
      try {
        const resp = await fetch(API_URL);
        const users = await resp.json();
        const userExists = users.some(user => user.chatId === chatId.toString());

        if (!userExists) {
          awaitingData[chatId] = { step: 1 };
          await sendMessage(chatId, 'Para se cadastrar, informe seu nome:');
        } else {
          await sendMessage(chatId, 'Você já está cadastrado para receber notificações.');
        }
      } catch (err) {
        console.error(err);
        await sendMessage(chatId, 'Erro ao verificar cadastro.');
      }
      break;

    default:
      break;
  }

  res.status(200).send('OK');
}

// 🔹 Função para enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}