const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 Remplacez par votre propre clé API OpenAI
const configuration = new Configuration({
  apiKey: 'VOTRE_CLÉ_API_OPENAI_ICI'
});
const openai = new OpenAIApi(configuration);

// Sert les fichiers statiques (dont chatbot.html)
app.use(express.static(__dirname));

// API de chat
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Une erreur est survenue." });
  }
});

// Redirige vers chatbot.html par défaut
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé : http://localhost:${PORT}`);
});

