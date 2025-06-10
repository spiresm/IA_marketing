require('dotenv').config(); // 🔐 Charge les variables d'environnement en local

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 Vérifie la présence de la clé API
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Clé API OpenAI manquante. Vérifie .env ou les variables Netlify.");
  process.exit(1);
}

// 🧠 Chargement des connaissances (tableau de pages)
let baseConnaissances = [];
try {
  const data = fs.readFileSync('./connaissances.json', 'utf-8');
  baseConnaissances = JSON.parse(data);
  console.log(`✅ ${baseConnaissances.length} pages de connaissances chargées.`);
} catch (err) {
  console.warn("⚠️ Aucune base de connaissances trouvée. Le chatbot fonctionnera sans contexte enrichi.");
}

// 🔧 Configuration de l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Endpoint principal avec injection du contexte
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  // 🔍 Construit un contexte synthétique à partir des pages connues
  const contexte = baseConnaissances
    .map(p => `📄 ${p.titre} (${p.url}) : ${p.contenu.slice(0, 500)}`)
    .join("\n\n");

  const systemPrompt = baseConnaissances.length > 0
    ? `Tu es un assistant IA pour le site d'équipe marketing. Voici des extraits utiles à connaître pour répondre :\n\n${contexte}`
    : "Tu es un assistant IA pour un site d'équipe marketing. Réponds aux questions aussi clairement que possible.";

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Erreur OpenAI :", error.message);
    res.status(500).json({ reply: "Une erreur est survenue côté serveur." });
  }
});

// 🌍 Sert l'interface HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// 🚀 Lance le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
