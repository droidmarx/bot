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

  if (text === '/start') {
    try {
      // Verifica se o usuário já está cadastrado
      const response = await fetch(`${API_URL}?chatId=${chatId}`);
      const data = await response.json();

      if (data.length === 0) {
        // Cadastra no mockapi
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        });

        await sendMessage(chatId, 'Você agora receberá notificações!');
      } else {
        await sendMessage(chatId, 'Você já está recebendo notificações.');
      }
    } catch (error) {
      console.error('Erro ao acessar o MockAPI:', error);
      await sendMessage(chatId, 'Ocorreu um erro. Tente novamente mais tarde.');
    }
  } else {
    try {
      // Obtém todos os usuários cadastrados e envia a mensagem para todos
      const response = await fetch(API_URL);
      const users = await response.json();

      await Promise.all(users.map(user => sendMessage(user.chatId, `Nova mensagem: ${text}`)));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }

  res.status(200).send('OK');
}

// Função para enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}