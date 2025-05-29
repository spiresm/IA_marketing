import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const filePath = './veille.html';
const prompts = JSON.parse(fs.readFileSync('./prompts.json', 'utf-8'));

const today = new Date().toISOString().slice(0, 10);
const prompt = `
Génère un tableau JSON contenant 10 articles récents sur l’intelligence artificielle, formaté strictement comme suit :

[
  {
    "titre": "Titre",
    "url": "https://...",
    "outil": "Nom de l’outil",
    "categorie": "Catégorie (Innovation, Marketing, etc.)",
    "date": "${today}",
    "resume": "Résumé court de 2 lignes max"
  }
]

Utilise les titres suivants comme base :
${prompts.map(p => `- ${p.titre}`).join('\n')}

⚠️ Réponds uniquement avec le tableau JSON. Aucune explication, aucun texte en dehors du JSON.
`;

async function updateVeille() {
  try {
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview', // Important pour `response_format: "json"`
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    let content = chatResponse.choices[0].message.content.trim();

    // Tente d'extraire le premier tableau JSON de la réponse
    const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!match) throw new Error("Aucun tableau JSON trouvé dans la réponse.");

    const jsonText = match[0];
    const articles = JSON.parse(jsonText);

    const newContent = `const articlesDataOriginal = ${JSON.stringify(articles, null, 2)};`;

    let html = fs.readFileSync(filePath, 'utf-8');
    const replaced = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

    if (html === replaced) {
      console.warn("⚠️ Aucun remplacement effectué. Vérifie que veille.html contient bien 'const articlesDataOriginal = [...]'.");
    } else {
      fs.writeFileSync(filePath, replaced, 'utf-8');
      console.log("✅ veille.html mise à jour avec succès !");
    }

  } catch (err) {
    console.error("❌ Erreur OpenAI :", err.message || err);
  }
}

updateVeille();
