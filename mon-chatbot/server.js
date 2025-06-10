require('dotenv').config(); // 🔐 Charge les variables d'environnement (local)

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔍 Vérification de la clé API
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Clé API OpenAI manquante. Vérifie .env ou les variables Netlify.");
  process.exit(1);
}

// 🧠 Chargement des connaissances JSON
let connaissances = {};
try {
  const data = fs.readFileSync('./connaissances.json', 'utf-8');
  connaissances = JSON.parse(data);
  console.log("✅ Base de connaissances chargée.");
} catch (err) {
  console.warn("⚠️ Aucun fichier de connaissances trouvé. Le chatbot fonctionnera sans contexte enrichi.");
}

// 🔧 Initialisation de l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🌐 Sert les fichiers statiques
app.use(express.static(__dirname));

// 🧠 Endpoint de chat avec contexte JSON injecté
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  const contexte = connaissances.presentation
    ? `Tu es un assistant IA basé sur les informations suivantes :
Présentation : ${connaissances.presentation}
Objectifs : ${connaissances.objectifs?.join(', ')}
Services : ${connaissances.services?.join(', ')}
Contact : ${connaissances.contact}
Utilise ces infos pour répondre.` 
    : "Tu es un assistant IA.";

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: contexte },
        { role: 'user', content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Erreur OpenAI :", error.message);
    res.status(500).json({ reply: "Une erreur est survenue côté serveur." });
  }
});

// 🔁 Redirection vers l'interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

// 🚀 Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
