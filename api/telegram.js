export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { chatId, text, imageUrl, audioUrl } = req.body;

  const BOT_TOKEN = process.env.TELEGRAM_TOKEN; // Corrigido para bater com o nome na Vercel

  try {
    if (text) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    }

    if (imageUrl) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: imageUrl }),
      });
    }

    if (audioUrl) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, audio: audioUrl }),
      });
    }

    res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar para Telegram:', err);
    res.status(500).json({ message: 'Erro ao enviar mensagem para o Telegram' });
  }
}