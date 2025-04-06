const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';
const PENDING_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/pending';

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

  try {
    // Verifica se já está registrado
    const userResp = await fetch(`${API_URL}?chatId=${chatId}`);
    const users = await userResp.json();

    // Verifica se está aguardando nome
    const pendingResp = await fetch(`${PENDING_URL}?chatId=${chatId}`);
    const pendingList = await pendingResp.json();

    if (pendingList.length > 0 && pendingList[0].step === 'awaiting_name') {
      const name = text;
      if (name.split(' ').length < 2) {
        await sendMessage(chatId, 'Por favor, envie seu nome completo.');
        return res.status(200).send('Nome inválido');
      }

      const avatarUrl = await getProfilePhoto(chatId);

      // Salva o usuário
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, name, avatar: avatarUrl }),
      });

      // Remove o pending
      await fetch(`${PENDING_URL}/${pendingList[0].id}`, { method: 'DELETE' });

      await sendMessage(chatId, `Registro concluído com o nome: *${name}*.`);
      return res.status(200).send('Nome registrado');
    }

    // Comando para acessar sistema
    if (text === '/command1') {
      await sendMessage(chatId, 'Acesse o sistema aqui: [INDAIBOT](https://estoque-control.vercel.app)');
      return res.status(200).send('Link enviado');
    }

    // Comando para registrar
    if (text === '/command2') {
      if (users.length > 0) {
        await sendMessage(chatId, 'Você já está registrado.');
      } else {
        // Marca como aguardando nome no banco
        await fetch(PENDING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, step: 'awaiting_name' }),
        });
        await sendMessage(chatId, 'Qual seu nome completo para o registro?');
      }
      return res.status(200).send('Aguardando nome');
    }

    // Comando para remover
    if (text === '/command3') {
      if (users.length > 0) {
        await fetch(`${API_URL}/${users[0].id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido.');
      } else {
        await sendMessage(chatId, 'Você não estava registrado.');
      }
      return res.status(200).send('Remoção feita');
    }

  } catch (err) {
    console.error('Erro:', err);
    await sendMessage(chatId, 'Ocorreu um erro ao processar.');
    return res.status(500).send('Erro no servidor');
  }

  res.status(200).send('OK');
}

// Envia mensagem formatada
async function sendMessage(chatId, text) {
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

// Pega a foto de perfil do usuário
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
  } catch (err) {
    console.error('Erro ao buscar avatar:', err);
  }
  return null;
}