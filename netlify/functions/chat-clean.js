// netlify/functions/chat-clean.js
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  const { message } = JSON.parse(event.body);

  // 🔎 Lecture du fichier de connaissances
  const filePath = path.join(__dirname, "../../connaissances.json");
  let connaissances = [];
  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    connaissances = JSON.parse(rawData);
  } catch (err) {
    console.error("Erreur chargement du fichier JSON", err);
  }

  // 🧠 Création du prompt système avec les connaissances
  const contexte = connaissances.map(
    (item) => `• ${item.titre} : ${item.contenu}`
  ).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant IA pour un site de marketing. Voici ce que tu sais faire :\n${contexte}\nRéponds de manière utile, claire et concise.`,
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    console.error("Erreur OpenAI:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur serveur OpenAI" }),
    };
  }
};
