import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const filePath = './veille.html';
const prompts = JSON.parse(fs.readFileSync('./prompts.json', 'utf-8'));

const today = new Date().toISOString().slice(0, 10);
const prompt = `
Voici une liste de titres d’actualité IA. Pour chacun, génère :
- un titre (repris ou reformulé)
- une URL fictive
- un outil IA associé (ex : Midjourney, GPT-4, etc.)
- une catégorie (Innovation, Médias, Produit...)
- la date du jour : ${today}
- un résumé synthétique (2 lignes max)

Formate ta réponse en tableau JSON uniquement. Pas d'introduction ni de texte autour.

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

    let jsonText = chatResponse.choices[0].message.content.trim();

    // Nettoie la réponse si encadrée par des balises markdown
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const articles = JSON.parse(jsonText);
    const newContent = `const articlesDataOriginal = ${JSON.stringify(articles, null, 2)};`;

    let html = fs.readFileSync(filePath, 'utf-8');
    const replaced = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

    if (html === replaced) {
      console.warn("⚠️ Aucun remplacement effectué dans veille.html. Vérifie que la balise 'const articlesDataOriginal = [...]' est bien présente.");
    } else {
      fs.writeFileSync(filePath, replaced, 'utf-8');
      console.log("✅ veille.html mise à jour !");
    }

  } catch (err) {
    console.error("❌ Erreur OpenAI :", err.message || err);
  }
}

updateVeille();
