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

  if (!username) {
    await sendMessage(chatId, 'Seu nome de usuário não está definido. Configure um username no Telegram antes de se registrar.');
    return res.status(200).send('Nome de usuário inválido');
  }

  const avatarUrl = await getProfilePhoto(chatId);

  try {
    const resp = await fetch(`${API_URL}?chatId=${chatId}`);
    const users = await resp.json();

    // 🔹 Comando para mostrar o chat ID
    if (text === '/meuid') {
      await sendMessage(chatId, `Seu *chat ID* é:\n\`${chatId}\``, 'Markdown');
      return res.status(200).send('Chat ID enviado');
    }

    if (text === '/command3') {
      if (users.length > 0) {
        await fetch(`${API_URL}/${users[0].id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não estava cadastrado.');
      }
      return res.status(200).send('Remoção processada');
    }

    if (text === '/command1') {
      await sendMessage(chatId, 'Acesse o sistema de estoque aqui: [Estoque Control](https://estoque-control.vercel.app/)', 'Markdown');
      return res.status(200).send('Link enviado');
    }

    if (text === '/command2') {
      if (users.length > 0) {
        await sendMessage(chatId, 'Você já está registrado.');
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            name: username,
            avatar: avatarUrl,
          })
        });

        await sendMessage(chatId, 'Registro concluído com sucesso! Agora você receberá notificações.');
      }
      return res.status(200).send('Registro processado');
    }
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    return res.status(500).send('Erro no servidor');
  }

  res.status(200).send('OK');
}

// 🔹 Função para enviar mensagens
async function sendMessage(chatId, text, parseMode = 'Markdown') {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

// 🔹 Função para obter a URL da foto de perfil do Telegram
async function getProfilePhoto(chatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}`);
    const data = await response.json();
    
    if (data.ok && data.result.total_count > 0) {
      const fileId = data.result.photos[0][0].file_id;
      const fileResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileResponse.json();

      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileData.result.file_path}`;
    }
  } catch (error) {
    console.error('Erro ao obter a foto de perfil:', error);
  }
  return null;
}