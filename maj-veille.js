import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const filePath = './veille.html';
const prompts = JSON.parse(fs.readFileSync('./prompts.json', 'utf-8'));

const today = new Date().toISOString().slice(0, 10);
const prompt = `
Voici des titres d'actualité IA à résumer. Pour chacun, génère :
- un titre (repris ou amélioré)
- une URL fictive
- un outil IA concerné (véridique ou plausible)
- une catégorie (Innovation, Médias, Produit...)
- la date : ${today}
- un résumé synthétique (2 lignes max)

Format : tableau JSON

Titres :
${prompts.map(p => `- ${p.titre}`).join('\n')}
`;

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
    const replaced = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

    if (html === replaced) {
      console.warn("⚠️ Aucun remplacement effectué. Vérifie que veille.html contient bien 'const articlesDataOriginal = [...]'");
    } else {
      fs.writeFileSync(filePath, replaced, 'utf-8');
      console.log("✅ veille.html mise à jour !");
    }

  } catch (err) {
    console.error("❌ Erreur OpenAI :", err.message || err);
  }
}

updateVeille();
