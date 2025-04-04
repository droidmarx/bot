const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';

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
  const username = message.from.username ? `@${message.from.username}` : null;
  const firstName = message.from.first_name || '';
  const lastName = message.from.last_name || '';
  const fullName = firstName + (lastName ? ` ${lastName}` : '');
  const profilePhoto = await getProfilePhoto(chatId);

  if (text === '/command2') {
    try {
      // 🔹 Obtém todos os usuários registrados
      const resp = await fetch(API_URL);
      const users = await resp.json();

      // 🔹 Verifica se o usuário já está cadastrado
      const userExists = users.some(user => user.chatId.toString() === chatId.toString());

      if (userExists) {
        await sendMessage(chatId, 'Você já está registrado.');
        return res.status(200).send('Usuário já registrado');
      }

      // 🔹 Valida o nome antes do cadastro
      let validName = username || fullName.trim();
      if (!validName) {
        await sendMessage(chatId, 'Qual é o seu nome? Responda com seu nome para concluir o cadastro.');
        return res.status(200).send('Aguardando nome');
      }

      // 🔹 Registra o usuário no MockAPI
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          name: validName,
          avatar: profilePhoto
        })
      });

      await sendMessage(chatId, 'Você foi registrado com sucesso.');
      return res.status(200).send('Usuário registrado');
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao verificar cadastro.');
    }
  }

  if (text === '/command3') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();

      // 🔹 Encontra todos os registros do usuário
      const userRecords = users.filter(user => user.chatId.toString() === chatId.toString());

      if (userRecords.length > 0) {
        // 🔹 Deleta todos os registros duplicados
        for (const user of userRecords) {
          await fetch(`${API_URL}/${user.id}`, { method: 'DELETE' });
        }
        await sendMessage(chatId, 'Seu registro foi removido.');
      } else {
        await sendMessage(chatId, 'Você não está registrado.');
      }
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    }
    return res.status(200).send('Remoção processada');
  }

  if (text === '/start') {
    await sendMessage(chatId, 'Seja bem-vindo!');
  }

  res.status(200).send('OK');
}

// 🔹 Função para enviar mensagens ao Telegram
async function sendMessage(chatId, text) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// 🔹 Função para obter a URL da foto de perfil do usuário
async function getProfilePhoto(chatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}`);
    const data = await response.json();

    if (data.ok && data.result.photos.length > 0) {
      const fileId = data.result.photos[0][0].file_id;
      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileResponse.json();
      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileData.result.file_path}`;
    }
  } catch (err) {
    console.error('Erro ao obter foto de perfil:', err);
  }
  return null;
}