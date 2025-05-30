import fs from 'fs/promises';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log("⏳ Appel à l’API OpenAI...");

try {
  const raw = JSON.parse(await fs.readFile('./raw-articles.json', 'utf-8'));

  if (!Array.isArray(raw)) {
    throw new Error("raw-articles.json doit contenir un tableau de titres (strings)");
  }

  const prompt = `Voici des titres récents d'articles d'actualité technologique :\n\n${raw.map(t => `- ${t}`).join('\n')}

Pour chacun, génère un objet JSON au format :
[
  {
    "titre": "...",
    "url": "...",
    "outil": "...",
    "categorie": "...",
    "date": "2025-05-30",
    "resume": "..."
  }
]
Ne rajoute pas de texte autour, réponds uniquement avec un tableau JSON.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: "Tu génères un tableau JSON structuré à partir de titres d'articles tech." },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  const result = completion.choices[0].message.content;

  try {
    const parsed = JSON.parse(result);
    await fs.writeFile('./articles-formattes.json', JSON.stringify(parsed, null, 2));
    console.log("✅ articles-formattes.json généré avec succès !");
  } catch (e) {
    console.error("❌ Erreur JSON : ", e.message);
    console.log("📝 Contenu reçu :\n", result);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Erreur de lecture/écriture : ", err.message);
  process.exit(1);
}
