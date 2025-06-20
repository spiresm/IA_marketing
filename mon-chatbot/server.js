require('dotenv').config(); // 🔐 Charge les variables d'environnement en local

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // 📦 Pour faire des requêtes HTTP

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🧠 Chargement des connaissances (tableau de pages)
let baseConnaissances = [];
try {
  const data = fs.readFileSync('./connaissances.json', 'utf-8');
  baseConnaissances = JSON.parse(data);
  console.log(`✅ ${baseConnaissances.length} pages de connaissances chargées.`);
} catch (err) {
  console.warn("⚠️ Aucune base de connaissances trouvée. Le chatbot fonctionnera sans contexte enrichi.");
}

// 🌐 URL du webhook N8N
const WEBHOOK_URL = 'https://cf59-169-155-241-172.ngrok-free.app -> http://localhost:5678'; // 🔁 À remplacer par ta vraie URL N8N

// 🧠 Endpoint principal avec appel au webhook N8N
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  // 🔍 Construit un contexte synthétique à partir des pages connues
  const contexte = baseConnaissances
    .map(p => `📄 ${p.titre} (${p.url}) : ${p.contenu.slice(0, 500)}`)
    .join("\n\n");

  const systemPrompt = baseConnaissances.length > 0
    ? `Tu es un assistant IA pour un site d'équipe marketing. Utilise les informations suivantes issues du site pour répondre précisément aux questions des utilisateurs.\n\n${contexte}`
    : "Tu es un assistant IA pour un site d'équipe marketing.";

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        contexte: systemPrompt
      })
    });

    const data = await response.json();
    res.json({ reply: data.reply || "Pas de réponse reçue." });
  } catch (error) {
    console.error("❌ Erreur lors de l’appel au webhook N8N :", error.message);
    res.status(500).json({ reply: "Erreur lors de l'appel au moteur IA via N8N." });
  }
});

// 🌍 Sert l’interface HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// 🚀 Lance le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
