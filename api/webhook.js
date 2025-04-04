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
  const username = message.from.username ? `@${message.from.username}` : 'Não informado';
  const avatar = message.from.photo ? message.from.photo[0].file_id : '';

  // 🔹 Encaminhamento de mensagens para usuários cadastrados
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

  // 🔹 Remoção de usuário do MockAPI
  if (text === '/command3') {
    try {
      const resp = await fetch(`${API_URL}?chatId=${chatId}`);
      const users = await resp.json();

      if (users.length > 0) {
        const userId = users[0].id;
        await fetch(`${API_URL}/${userId}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não está registrado para notificações.');
      }
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      await sendMessage(chatId, 'Ocorreu um erro ao processar sua solicitação.');
    }
    return res.status(200).send('Remoção processada');
  }

  // 🔹 Registro automático do usuário (se não existir)
  if (text === '/command2') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const userExists = users.some(user => user.chatId === chatId.toString());

      if (!userExists) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            name: username,
            avatar
          })
        });

        await sendMessage(chatId, 'Você foi registrado com sucesso para receber notificações.');
      } else {
        await sendMessage(chatId, 'Você já está cadastrado para receber notificações.');
      }
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao verificar cadastro.');
    }
    return res.status(200).send('Registro verificado');
  }

  // 🔹 Mensagem padrão para o comando /start
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