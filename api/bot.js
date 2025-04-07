const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';

let awaitingData = {};

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const update = req.body;
  const message = update?.message;
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;
  const user = message.from;
  const username = user.username ? `@${user.username}` : 'Sem usuário';

  // Registro interativo
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
        const profilePhoto = await getUserProfilePhoto(user.id);

        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            name: `${userData.name} ${userData.surname}`,
            phone: userData.phone,
            avatar: profilePhoto || 'https://via.placeholder.com/150',
            username: username
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

  // Comando de cadastro
  if (text === '/command2') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const userExists = users.some(user => user.chatId === chatId.toString());

      if (!userExists) {
        awaitingData[chatId] = {};
        await sendMessage(chatId, 'Para se cadastrar, informe seu nome:');
      } else {
        await sendMessage(chatId, 'Você já está cadastrado para receber notificações.');
      }
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao verificar cadastro.');
    }
    return res.status(200).send('OK');
  }

  // Comando simples para teste
  if (text === '/start') {
    await sendMessage(chatId, 'Olá! Bot está online e funcionando.');
  }

  res.status(200).send('OK');
}

// Envia mensagem
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// Busca foto de perfil
async function getUserProfilePhoto(userId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${userId}`);
    const data = await response.json();
    if (data.ok && data.result.total_count > 0) {
      const fileId = data.result.photos[0][0].file_id;
      const filePath = await getFilePath(fileId);
      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
    }
  } catch (error) {
    console.error('Erro ao obter foto de perfil:', error);
  }
  return null;
}

async function getFilePath(fileId) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await response.json();
  return data.ok ? data.result.file_path : null;
}