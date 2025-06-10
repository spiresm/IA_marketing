require('dotenv').config(); // 🔐 Charge les variables depuis .env

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // Compatible avec openai@4.x
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Vérifie que la clé est présente
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERREUR : Clé API OpenAI manquante dans le fichier .env");
  process.exit(1); // arrête le serveur
}

// Initialise l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log("✅ Clé API chargée : OK");

app.use(express.static(__dirname));

// Endpoint de chat
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

// Redirige vers chatbot.html par défaut
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
