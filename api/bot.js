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
  
  // 🔹 Encaminha mensagens enviadas pelo bot para todos os usuários
  if (chatId === 5759760387) {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      
      if (!users.length) {
        console.log('Nenhum usuário registrado para receber notificações.');
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
  
  // 🛑 Remover notificações (/command3)
  if (text === '/command3') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      
      const user = users.find(user => user.chatId.toString() === chatId.toString());
      
      if (user) {
        await fetch(`${API_URL}/${user.id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você já foi removido ou não estava cadastrado.');
      }
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      await sendMessage(chatId, 'Ocorreu um erro ao processar sua solicitação.');
    }
    return res.status(200).send('Remoção processada');
  }
  
  // 1️⃣ Registro de nome após o comando /nome
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
  
  // 2️⃣ Comandos básicos
  switch (text) {
    case '/start':
      await sendMessage(chatId, 'Seja muito bem-vindo!');
      break;
      
    case '/command1':
      await sendMessage(chatId, 'Acesse o site aqui: https://estoque-control.vercel.app/');
      break;
      
    case '/command2':
      try {
        const resp = await fetch(API_URL);
        const users = await resp.json();
        const userExists = users.some(user => user.chatId.toString() === chatId.toString());

        if (!userExists) {
          const nome = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim();
          const username = message.from.username || '';

          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, nome, username })
          });

          await sendMessage(chatId, `Você foi cadastrado com sucesso!\nNome: ${nome}\nUsername: @${username}`);
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
      break;
  }
  
  res.status(200).send('OK');
}

// Função para enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}