export default async function handler(req, res) {
    if (req.method === "POST") {
        const { message } = req.body;
        if (message) {
            const chatId = message.chat.id;
            const text = message.text;

            // Responde a mensagem
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `Você disse: ${text}`,
                }),
            });

            return res.status(200).json({ status: "ok" });
        }
    }

    res.status(400).json({ error: "Método não suportado" });
}