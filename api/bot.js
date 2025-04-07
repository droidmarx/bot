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

  // 2️⃣ Comando de cadastro
  if (text === '/command2') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const userExists = users.some(user => user.chatId.toString() === chatId.toString());

      if (!userExists) {
        const photoUrl = await getUserPhotoUrl(chatId);
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, photoUrl })
        });
        await sendMessage(chatId, 'Você agora receberá notificações!');
      } else {
        await sendMessage(chatId, 'Você já está recebendo notificações.');
      }
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao cadastrar usuário.');
    }
    return res.status(200).send('Cadastro processado');
  }

  // 3️⃣ Perguntar nome
  if (text === '/nome') {
    awaitingName[chatId] = true;
    await sendMessage(chatId, 'Qual o seu nome?');
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

// Função para obter a URL real da foto de perfil do usuário
async function getUserPhotoUrl(chatId) {
  try {
    const resPhotos = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}&limit=1`);
    const data = await resPhotos.json();

    const fileId = data.result.photos?.[0]?.[0]?.file_id;
    if (!fileId) return null;

    const resFile = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await resFile.json();
    const filePath = fileData.result.file_path;

    return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
  } catch (err) {
    console.error('Erro ao obter foto de perfil:', err);
    return null;
  }
}