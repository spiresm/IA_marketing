import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const filePath = './veille.html';

const prompt = `Donne-moi une liste de 5 actualités récentes (mai 2025) sur l’intelligence artificielle. 
Formate la réponse en JSON comme ceci :
[
  {
    "titre": "...",
    "url": "...",
    "outil": "...",
    "categorie": "...",
    "date": "2025-05-29",
    "resume": "..."
  }
]
Pas de texte autour, juste un tableau JSON pur.`;

async function updateVeille() {
  try {
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const jsonText = chatResponse.choices[0].message.content;
    const articles = JSON.parse(jsonText);

    const newContent = `const articlesDataOriginal = ${JSON.stringify(articles, null, 2)};`;

    let html = fs.readFileSync(filePath, 'utf-8');
    html = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);
    fs.writeFileSync(filePath, html, 'utf-8');

    console.log('✅ veille.html mise à jour avec les articles générés par ChatGPT');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  }
}

updateVeille();

