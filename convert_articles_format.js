const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const rawPath = path.join(__dirname, 'raw-articles.json');
const outputPath = path.join(__dirname, 'articles-formattes.json');

async function enrichArticle(article) {
  const prompt = `Tu es un assistant expert en marketing IA. Voici un article brut :
Titre : ${article.title}
URL : ${article.url}
Date : ${article.publishedAt}
Contenu : ${article.description || article.content || 'non précisé'}

Génère un JSON au format :
{
  "titre": "...",
  "url": "...",
  "date": "...",
  "outil": "...",
  "categorie": "...",
  "resume": "..."
}`;

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const jsonText = response.data.choices[0].message.content;
  try {
    return JSON.parse(jsonText);
  } catch {
    console.error('Erreur JSON :', jsonText);
    return null;
  }
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
  const enriched = [];

  for (const article of raw.articles.slice(0, 10)) {
    const data = await enrichArticle(article);
    if (data) enriched.push(data);
  }

  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`✅ ${enriched.length} articles enrichis enregistrés dans ${outputPath}`);
})();
