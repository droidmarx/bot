const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';
const PENDING_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/pending';

// Função para enviar mensagens no Telegram
async function sendMessage(chatId, text) {
  const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  await fetch(TELEGRAM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

// Função fictícia para obter avatar do usuário
async function getProfilePhoto(chatId) {
  // Simule ou retorne uma URL padrão
  return `https://api.dicebear.com/7.x/initials/svg?seed=${chatId}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const update = req.body;
  const message = update?.message;
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;

  try {
    const usersResp = await fetch(`${API_URL}?chatId=${chatId}`);
    const users = await usersResp.json();

    const pendingResp = await fetch(`${PENDING_URL}?chatId=${chatId}`);
    const pending = await pendingResp.json();

    // Se está aguardando nome
    if (pending.length > 0) {
      const name = text.trim();
      const avatar = await getProfilePhoto(chatId);

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, name, avatar }),
      });

      // Remove do "pending"
      await fetch(`${PENDING_URL}/${pending[0].id}`, {
        method: 'DELETE',
      });

      await sendMessage(chatId, `Registro concluído com o nome: *${name}*. Agora você receberá notificações.`);
      return res.status(200).send('Nome registrado');
    }

    // /command3 → remover
    if (text === '/command3') {
      if (users.length > 0) {
        await fetch(`${API_URL}/${users[0].id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Seu registro foi removido. Você não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não estava cadastrado.');
      }
      return res.status(200).send('Remoção processada');
    }

    // /command1 → link
    if (text === '/command1') {
      await sendMessage(chatId, 'Acesse o sistema aqui: [INDAIBOT](https://estoque-control.vercel.app)');
      return res.status(200).send('Link enviado');
    }

    // /command2 → registrar
    if (text === '/command2') {
      if (users.length > 0) {
        await sendMessage(chatId, 'Você já está registrado.');
      } else {
        // Salva no "pending"
        await fetch(PENDING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        });
        await sendMessage(chatId, 'Qual seu nome para o registro? Responda com seu nome completo.');
      }
      return res.status(200).send('Aguardando nome');
    }

  } catch (err) {
    console.error('Erro ao processar requisição:', err);
    await sendMessage(chatId, 'Erro ao processar sua solicitação.');
    return res.status(500).send('Erro no servidor');
  }

  res.status(200).send('OK');
}