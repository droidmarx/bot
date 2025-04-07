const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';
const ADMIN_CHAT_ID = 5759760387; // Substitua pelo seu chatId

// Memória temporária para salvar estados por chatId
const pendingNames = {};

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

  try {
    const resp = await fetch(`${API_URL}?chatId=${chatId}`);
    const users = await resp.json();

    // Se está aguardando nome
    if (pendingNames[chatId]) {
      const name = text.trim();
      const avatarUrl = await getProfilePhoto(chatId);

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, name, avatar: avatarUrl }),
      });

      delete pendingNames[chatId];
      await sendMessage(chatId, `Registro concluído com o nome: *${name}*. Agora você receberá notificações.`);
      return res.status(200).send('Nome registrado');
    }

    // /command1 - Link do sistema
    if (text === '/command1') {
      await sendMessage(chatId, 'Acesse o sistema aqui: [INDAIBOT](https://estoque-control.vercel.app)');
      return res.status(200).send('Link enviado');
    }

    // /command2 - Registro
    if (text === '/command2') {
      if (users.length > 0) {
        await sendMessage(chatId, 'Você já está registrado.');
      } else {
        pendingNames[chatId] = true;
        await sendMessage(chatId, 'Qual seu nome para o registro? Responda com seu nome completo.');
      }
      return res.status(200).send('Aguardando nome');
    }

    // /command3 - Remover registro
    if (text === '/command3') {
      if (users.length > 0) {
        await fetch(`${API_URL}/${users[0].id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não estava cadastrado.');
      }
      return res.status(200).send('Remoção processada');
    }

    // /todos - Listar usuários (apenas admin)
    if (text === '/todos') {
      if (chatId !== ADMIN_CHAT_ID) {
        await sendMessage(chatId, 'Você não tem permissão para ver essa lista.');
        return res.status(200).send('Acesso negado');
      }

      const all = await fetch(API_URL).then(r => r.json());
      if (all.length === 0) {
        await sendMessage(chatId, 'Nenhum usuário registrado até o momento.');
      } else {
        const list = all.map(u => `• ${u.name}`).join('\n');
        await sendMessage(chatId, `*Usuários registrados:*\n${list}`);
      }
      return res.status(200).send('Lista enviada');
    }

  } catch (err) {
    console.error('Erro ao processar requisição:', err);
    await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    return res.status(500).send('Erro no servidor');
  }

  res.status(200).send('OK');
}

// Função para enviar mensagens
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

// Função para obter a URL da foto de perfil do Telegram
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