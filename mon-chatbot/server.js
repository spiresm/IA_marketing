require('dotenv').config(); // 🔐 Charge les variables d’environnement

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // ✅ Version 4+
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ clé lue depuis .env
});

app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Une erreur est survenue." });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});
