export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body;

    const message = data?.message?.text;
    const chatId = data?.message?.chat?.id;

    if (message === "1") {
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Você enviou 1, e eu respondi!"
        })
      });
    }

    res.status(200).send("OK");
  } else {
    res.status(405).send("Method Not Allowed");
  }
}