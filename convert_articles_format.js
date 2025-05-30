import fs from 'fs/promises';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function enrichArticles() {
  try {
    const rawData = await fs.readFile('./raw-articles.json', 'utf-8');
    let raw;

    try {
      raw = JSON.parse(rawData);
    } catch (parseErr) {
      throw new Error("❌ Impossible de parser raw-articles.json. Vérifie que le JSON est valide.");
    }

    if (!Array.isArray(raw)) {
      throw new Error("❌ Le contenu de raw-articles.json doit être un tableau JSON (ex: [...]).");
    }

    const prompt = `Voici une liste d'articles bruts:\n\n${JSON.stringify(raw, null, 2)}\n\nPour chaque article, génère un objet JSON avec les champs suivants : titre, url, outil, categorie, date (YYYY-MM-DD), resume. Réponds uniquement avec un tableau JSON.`;

    console.log("⏳ Appel à l’API OpenAI...");
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant spécialisé en veille technologique IA pour le marketing.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const jsonText = chatResponse.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error("❌ La réponse de ChatGPT n'est pas du JSON valide.");
    }

    if (!Array.isArray(parsed)) {
      throw new Error("❌ La réponse de ChatGPT n’est pas un tableau JSON.");
    }

    await fs.writeFile('./prompts.json', JSON.stringify(parsed, null, 2), 'utf-8');
    console.log("✅ prompts.json mis à jour !");
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

enrichArticles();
