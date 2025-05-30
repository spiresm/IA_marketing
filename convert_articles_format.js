// convert_articles_format.js
import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INPUT_PATH = './prompts.json';
const OUTPUT_PATH = './articles-formattes.json';

async function enrichArticles() {
  console.log('⏳ Lecture du fichier prompts.json...');
  const titles = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));

  const prompt = `Voici une liste de titres d'articles sur l'IA et le marketing. Pour chacun, génère un objet JSON contenant :\n- titre\n- resume (en une phrase)\n- date (aujourd'hui)\n- outil\n- categorie\n- source\n- url fictive\n\nRéponds avec un tableau JSON.\nTitres :\n${titles.map(t => `- ${t}`).join('\n')}`;

  console.log('⏳ Appel à l’API OpenAI...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const rawOutput = completion.choices[0].message.content;

  try {
    const articles = JSON.parse(rawOutput);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(articles, null, 2));
    console.log('✅ prompts.json mis à jour avec des articles enrichis !');
  } catch (err) {
    console.error('❌ Erreur lors du parsing JSON :', err.message);
    console.error('📝 Contenu reçu :', rawOutput);
    process.exit(1);
  }
}

enrichArticles();
