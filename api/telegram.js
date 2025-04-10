export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { chatId, text, imageUrl, audioUrl } = req.body;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

  if (!TELEGRAM_TOKEN) {
    return res.status(500).json({ message: 'Token do Telegram não configurado.' });
  }

  if (!chatId || !text) {
    return res.status(400).json({ message: 'chatId e text são obrigatórios.' });
  }

  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

  try {
    // Enviar texto
    await fetch(`${baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    // Enviar imagem, se houver
    if (imageUrl) {
      await fetch(`${baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: imageUrl })
      });
    }

    // Enviar áudio, se houver
    if (audioUrl) {
      await fetch(`${baseUrl}/sendAudio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, audio: audioUrl })
      });
    }

    res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar para o Telegram:', error);
    res.status(500).json({ message: 'Erro ao enviar mensagem.' });
  }
}