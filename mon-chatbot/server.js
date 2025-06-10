// 🔐 Charge les variables d'environnement (en local uniquement)
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // Compatible avec openai@4.x
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Vérifie la présence de la clé API
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERREUR : Clé API OpenAI manquante. Vérifie le fichier .env en local ou les variables Netlify en production.");
  process.exit(1);
}

// ✅ Initialise l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("✅ Clé API chargée : OK");

// ✅ Sert les fichiers statiques comme chatbot.html
app.use(express.static(__dirname));

// ✅ Endpoint principal du chatbot
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Erreur OpenAI :", error.message);
    res.status(500).json({ reply: "Une erreur est survenue côté serveur." });
  }
});

// ✅ Redirection vers la page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// ✅ Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
