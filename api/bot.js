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
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;

  // ✅ Comando 4: Verificar técnicos e contar instalações
  if (chatId === 5759760387 && text === '/command4') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const tecnicos = ['André', 'Elvis', 'Guilherme', 'Janderson', 'Robson'];

      const contagem = tecnicos.map(nome => {
        const count = users.filter(u => u.nome?.toLowerCase() === nome.toLowerCase()).length;
        return `${nome}: ${count}`;
      }).join('\n');

      await sendMessage(chatId, `Instalações por técnico:\n\n${contagem}`);
      return res.status(200).send('Contagem enviada');
    } catch (err) {
      console.error('Erro ao contar instalações:', err);
      await sendMessage(chatId, 'Erro ao contar instalações.');
      return res.status(500).send('Erro ao processar /command4');
    }
  }

  // ✅ Comando 3: Remover usuário
  if (text === '/command3') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const user = users.find(user => user.chatId.toString() === chatId.toString());

      if (user) {
        await fetch(`${API_URL}/${user.id}`, { method: 'DELETE' });
        await sendMessage(chatId, 'Você foi removido e não receberá mais notificações.');
      } else {
        await sendMessage(chatId, 'Você não estava cadastrado.');
      }
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      await sendMessage(chatId, 'Erro ao remover seu registro.');
    }
    return res.status(200).send('Remoção processada');
  }

  // ✅ Registrar nome após /nome
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

  // ✅ Comandos
  switch (text) {
    case '/start':
      await sendMessage(chatId, 'Seja bem-vindo! Use os comandos /command1, /command2, /command3, /command4.');
      break;

    case '/command1':
      await sendMessage(chatId, 'Acesse o site aqui: https://estoque-control.vercel.app/');
      break;

    case '/command2':
      try {
        const resp = await fetch(API_URL);
        const users = await resp.json();
        const exists = users.some(u => u.chatId.toString() === chatId.toString());

        if (!exists) {
          const profilePhoto = await getUserProfilePhoto(chatId);

          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, foto: profilePhoto })
          });

          await sendMessage(chatId, 'Você foi cadastrado com sucesso!');
        } else {
          await sendMessage(chatId, 'Você já está cadastrado.');
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

// ✅ Enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// ✅ Buscar foto de perfil do usuário
async function getUserProfilePhoto(chatId) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${chatId}`);
    const data = await resp.json();
    const photoId = data.result?.photos?.[0]?.[0]?.file_id;

    if (!photoId) return null;

    const fileResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${photoId}`);
    const fileData = await fileResp.json();
    const filePath = fileData.result.file_path;

    return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
  } catch (err) {
    console.error('Erro ao buscar foto de perfil:', err);
    return null;
  }
}