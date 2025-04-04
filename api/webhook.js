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

  if (text === '/command2') {
    try {
      // Verifica se já está cadastrado
      const response = await fetch(`${API_URL}?chatId=${chatId}`);
      const data = await response.json();

      if (data.length === 0) {
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
      console.error('Erro ao cadastrar usuário:', error);
      await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    }
  }

  // Se a mensagem veio do chat 5759760387, envia para todos os usuários
  if (chatId === 5759760387) {
    try {
      const response = await fetch(API_URL);
      const users = await response.json();

      await Promise.all(
        users.map(user => sendMessage(user.chatId, text))
      );
    } catch (error) {
      console.error('Erro ao repassar mensagem:', error);
    }
  }

  res.status(200).send('OK');
}

// Função para enviar mensagens
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}