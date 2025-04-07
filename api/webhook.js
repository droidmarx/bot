// pages/api/webhook.js

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';

// 🔹 Salva estados temporários por chatId
const pendingNames = {};

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const update = req.body;
  const message = update?.message;
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text?.trim();
  if (!text) return res.status(200).send('Empty text');

  try {
    // Busca usuário no MockAPI
    const resp = await fetch(`${API_URL}?chatId=${chatId}`);
    const users = await resp.json();

    // 🔹 Aguardando nome
    if (pendingNames[chatId]) {
      if (!text || text.length < 2) {
        await sendMessage(chatId, 'O nome está muito curto ou inválido. Por favor, envie seu nome completo.');
        return res.status(200).send('Nome inválido');
      }

      const avatarUrl = await getProfilePhoto(chatId);

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          name: text,
          avatar: avatarUrl,
        }),
      });

      delete pendingNames[chatId];
      await sendMessage(chatId, `Registro concluído com o nome: *${text}*. Agora você receberá notificações.`);
      return res.status(200).send('Nome registrado');
    }

    // 🔹 Comando: enviar link
    if (text === '/command1') {
      await sendMessage(chatId, 'Acesse o sistema aqui: [INDAIBOT](https://estoque-control.vercel.app)');
      return res.status(200).send('Link enviado');
    }

    // 🔹 Comando: registrar
    if (text === '/command2') {
      if (users.length > 0) {
        await sendMessage(chatId, 'Você já está registrado.');
      } else {
        pendingNames[chatId] = true;
        await sendMessage(chatId, 'Qual seu nome completo para o registro?');
      }
      return res.status(200).send('Aguardando nome');
    }

    // 🔹 Comando: remover
    if (text === '/command3') {
      if (users.length > 0) {
        await fetch(`${API_URL}/${users[0].id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não estava cadastrado.');
      }
      return res.status(200).send('Remoção processada');
    }

  } catch (err) {
    console.error('Erro ao processar requisição:', err);
    await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    return res.status(500).send('Erro no servidor');
  }

  return res.status(200).send('OK');
}

// 🔹 Enviar mensagens para o Telegram
async function sendMessage(chatId, text) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

// 🔹 Obter foto de perfil
async function getProfilePhoto(chatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}`);
    const data = await response.json();

    if (data.ok && data.result.total_count > 0) {
      const fileId = data.result.photos[0][0].file_id;
      const fileResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileResp.json();

      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileData.result.file_path}`;
    }
  } catch (error) {
    console.error('Erro ao obter a foto de perfil:', error);
  }
  return null;
}