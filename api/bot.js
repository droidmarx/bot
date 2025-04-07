const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_URL = 'https://67ef52aec11d5ff4bf7c4f30.mockapi.io/users';
const BD_URL = 'https://66d39f5c184dce1713d09736.mockapi.io/Api/v1/BD';

let awaitingData = {};

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const update = req.body;
  const message = update?.message;
  if (!message) return res.status(200).send('No message');

  const chatId = message.chat.id;
  const text = message.text;
  const user = message.from;
  const username = user.username ? `@${user.username}` : 'Sem usuário';

  // 🔹 Comando /start
  if (text === '/start') {
    await sendMessage(chatId, 'Seja muito bem-vindo!');
    return res.status(200).send('OK');
  }

  // 🔹 Comando /command1
  if (text === '/command1') {
    await sendMessage(chatId, 'Acesse o sistema aqui:\nhttps://estoque-control.vercel.app/');
    return res.status(200).send('OK');
  }

  // 🔹 Comando /command2 - Registro
  if (text === '/command2') {
    try {
      const resp = await fetch(API_URL);
      const users = await resp.json();
      const userExists = users.some(user => user.chatId === chatId.toString());

      if (!userExists) {
        awaitingData[chatId] = {};
        await sendMessage(chatId, 'Para se cadastrar, informe seu nome:');
      } else {
        await sendMessage(chatId, 'Você já está cadastrado para receber notificações.');
      }
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao verificar cadastro.');
    }
    return res.status(200).send('OK');
  }

  // 🔹 Comando /command3 - Contagem de instalações
  if (text === '/command3') {
    try {
      const response = await fetch(API_URL);
      const users = await response.json();
      const userInstalls = users.filter(user => user.chatId === chatId.toString());

      if (userInstalls.length === 0) {
        await sendMessage(chatId, 'Você ainda não está cadastrado ou não tem registros de instalações.');
        return res.status(200).send('OK');
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      let totalInstalacoes = 0;

      const installsResponse = await fetch(BD_URL);
      const installs = await installsResponse.json();

      installs.forEach(inst => {
        const dataInstalacao = new Date(inst.data);
        const tecnico = inst.tecnico;

        const isSameMonth = dataInstalacao.getMonth() === currentMonth &&
                            dataInstalacao.getFullYear() === currentYear;

        if (isSameMonth && tecnico === userInstalls[0].name) {
          totalInstalacoes++;
        }
      });

      await sendMessage(chatId, `Você realizou ${totalInstalacoes} instalação${totalInstalacoes !== 1 ? 's' : ''} neste mês.`);
    } catch (err) {
      console.error(err);
      await sendMessage(chatId, 'Erro ao verificar suas instalações.');
    }
    return res.status(200).send('OK');
  }

  // 🔹 Registro interativo após /command2
  if (awaitingData[chatId]) {
    const userData = awaitingData[chatId];

    if (!userData.name) {
      awaitingData[chatId].name = text;
      await sendMessage(chatId, 'Agora, informe seu sobrenome:');
    } else if (!userData.surname) {
      awaitingData[chatId].surname = text;
      await sendMessage(chatId, 'Por fim, informe seu número de celular:');
    } else {
      awaitingData[chatId].phone = text;
      try {
        const profilePhoto = await getUserProfilePhoto(user.id);

        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            name: `${userData.name} ${userData.surname}`,
            phone: userData.phone,
            avatar: profilePhoto || 'https://via.placeholder.com/150',
            username: username
          })
        });

        delete awaitingData[chatId];
        await sendMessage(chatId, 'Registrado com sucesso! Agora você receberá notificações.');
      } catch (err) {
        console.error(err);
        await sendMessage(chatId, 'Erro ao registrar seus dados.');
      }
    }
    return res.status(200).send('Registro processado');
  }

  res.status(200).send('OK');
}

// 🔹 Envia mensagem para o Telegram
async function sendMessage(chatId, text) {
  console.log(`Enviando mensagem para ${chatId}: ${text}`);
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// 🔹 Obtém a foto de perfil do usuário
async function getUserProfilePhoto(userId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${userId}`);
    const data = await response.json();
    if (data.ok && data.result.total_count > 0) {
      const fileId = data.result.photos[0][0].file_id;
      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${await getFilePath(fileId)}`;
    }
  } catch (error) {
    console.error('Erro ao obter foto de perfil:', error);
  }
  return null;
}

// 🔹 Caminho do arquivo da foto de perfil
async function getFilePath(fileId) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await response.json();
  return data.ok ? data.result.file_path : null;
}