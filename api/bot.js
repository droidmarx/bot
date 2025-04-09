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
  const callbackQuery = update?.callback_query;

  // 🔹 Tratar botões inline
  if (callbackQuery) {
    const data = callbackQuery.data;
    const fromId = callbackQuery.from.id;

    switch (data) {
      case 'cadastrar':
        req.body.message = { chat: { id: fromId }, text: '/command2', from: callbackQuery.from };
        return await handler(req, res);
      case 'remover':
        req.body.message = { chat: { id: fromId }, text: '/command3', from: callbackQuery.from };
        return await handler(req, res);
    }
  }

  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;

  // 🔹 Encaminha mensagens do admin para todos os usuários
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

  // 🛑 Remover notificações
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

  // 1️⃣ Registro de nome após /nome
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

  // 2️⃣ Comandos
  switch (text) {
    case '/start':
      await sendMessage(chatId, 'Seja muito bem-vindo! Escolha uma opção:', {
        inline_keyboard: [
          [{ text: 'Abrir Estoque Control', url: 'https://estoque-control.vercel.app/' }],
          [{ text: 'Cadastrar-se', callback_data: 'cadastrar' }],
          [{ text: 'Remover Cadastro', callback_data: 'remover' }]
        ]
      });
      break;

    case '/command1':
      await sendMessage(chatId, 'https://estoque-control.vercel.app/');
      break;

    case '/command2':
      try {
        const resp = await fetch(API_URL);
        const users = await resp.json();
        const userExists = users.some(user => user.chatId.toString() === chatId.toString());

        if (!userExists) {
          const nome = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim();
          const username = message.from.username || '';

          // Foto de perfil
          const profileResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}&limit=1`);
          const profileData = await profileResp.json();

          let photoUrl = '';
          if (profileData.ok && profileData.result.total_count > 0) {
            const fileId = profileData.result.photos[0][0].file_id;
            const fileResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileResp.json();

            if (fileData.ok) {
              photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileData.result.file_path}`;
            }
          }

          // Salvar usuário
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, nome, username, photoUrl })
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

// Função genérica para enviar mensagem
async function sendMessage(chatId, text, replyMarkup = null) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  const payload = {
    chat_id: chatId,
    text,
    ...(replyMarkup && { reply_markup: { inline_keyboard: replyMarkup.inline_keyboard } })
  };

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}