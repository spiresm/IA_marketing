import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const filePath = './veille.html';

async function updateVeille() {
  try {
    console.log("⏳ Appel à l’API OpenAI...");
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant qui génère un tableau JSON d’articles récents sur l’IA marketing. Chaque objet doit contenir : titre, url, outil, categorie, date (au format AAAA-MM-JJ), resume.'
        },
        {
          role: 'user',
          content: 'Génère une liste de 10 articles récents au format JSON (pas de markdown, pas de texte autour).'
        }
      ],
      temperature: 0.7
    });

    let jsonText = chatResponse.choices[0].message.content.trim();

    // Nettoyage si ChatGPT renvoie avec balises ```json ou ```
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const articles = JSON.parse(jsonText);

    const newContent = `const articlesDataOriginal = ${JSON.stringify(articles, null, 2)};`;

    let html = fs.readFileSync(filePath, 'utf-8');

    // Remplacement de la variable dans le HTML
    html = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

    // 🔧 Ajout d’un commentaire invisible pour forcer un changement
    const timestamp = new Date().toISOString();
    html += `\n<!-- MAJ AUTO : ${timestamp} -->\n`;

    fs.writeFileSync(filePath, html, 'utf-8');

    console.log("✅ veille.html mise à jour !");
  } catch (err) {
    console.error("❌ Erreur OpenAI :", err.message || err);
  }
}

updateVeille();
