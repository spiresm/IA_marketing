import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichArticles() {
  console.log("⏳ Appel à l’API OpenAI...");

  const raw = JSON.parse(fs.readFileSync('./raw-articles.json', 'utf-8'));

  if (!Array.isArray(raw)) {
    throw new Error("❌ Le contenu de raw-articles.json doit être un tableau.");
  }

  const messages = [
    {
      role: 'system',
      content: `Tu es un assistant expert en veille technologique. Reçois une liste de titres d'articles et reformate-les en objets JSON avec :
- titre
- url (fictive si absente)
- outil
- categorie
- date du jour
- resume de 30 mots maximum
Retourne un tableau JSON, sans autre texte.`
    },
    {
      role: 'user',
      content: raw.map(titre => `- ${titre}`).join('\n')
    }
  ];

  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    temperature: 0.7
  });

  const jsonText = chatResponse.choices[0].message.content;

  let formatted;
  try {
    formatted = JSON.parse(jsonText);
  } catch (err) {
    console.error("❌ Erreur lors du parsing JSON :", err.message);
    console.log("📝 Contenu reçu :", jsonText);
    process.exit(1);
  }

  fs.writeFileSync('./articles-formattes.json', JSON.stringify(formatted, null, 2), 'utf-8');
  console.log("✅ prompts.json mis à jour !");
}

enrichArticles();
