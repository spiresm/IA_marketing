require('dotenv').config(); // charge la clé API depuis .env

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // compatible avec openai@4.x
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ne JAMAIS mettre la clé en dur
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: 'Une erreur est survenue.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chatbot.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé : http://localhost:${PORT}`);
});
