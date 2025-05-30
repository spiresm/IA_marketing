import fs from 'fs/promises';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const instructions = `
À partir de cette liste brute d’articles (sous forme d’un tableau JSON), sélectionne :
- Minimum 2 articles par catégorie (champ "categorie")
- Au moins 1 article par outil distinct (champ "outil")
- Pas de doublon (titre, date ou url identiques)
- Les 20 articles les plus pertinents et récents

Pour chaque article, retourne un objet sous ce format EXACT :
{
  "titre": "...",
  "resume": "...",
  "date": "YYYY-MM-DD",
  "outil": "...",
  "categorie": "...",
  "source": "...",
  "url": "https://..."
}

Retourne uniquement un tableau JSON valide, sans texte autour.
`;

try {
  console.log('⏳ Lecture du fichier prompts.json...');
  const promptsRaw = await fs.readFile('./prompts.json', 'utf-8');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Tu es un assistant qui reformate des articles en JSON structuré.' },
      { role: 'user', content: `Voici la liste des articles :\n${promptsRaw}\n\n${instructions}` },
    ],
    temperature: 0.4,
  });

  const jsonText = completion.choices[0].message.content.trim();

  console.log('\n🔍 JSON reçu :\n', jsonText);

  let articles;
  try {
    articles = JSON.parse(jsonText);
  } catch (err) {
    console.error('❌ Erreur parsing JSON :', err.message);
    console.log('📝 Contenu reçu :', jsonText);
    process.exit(1);
  }

  const htmlArticles = articles.map((a) => {
    return `  {
    titre: "${a.titre}",
    url: "${a.url}",
    outil: "${a.outil}",
    categorie: "${a.categorie}",
    date: "${a.date}",
    resume: "${a.resume} (Source : ${a.source})"
  }`;
  }).join(',\n');

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Veille IA Marketing</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: sans-serif; margin: 2rem; background: #f8f9fa; }
    .card { background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .date, .categorie, .outil { font-size: 0.9rem; color: #555; }
    .titre { font-weight: bold; font-size: 1.2rem; margin: 0.5rem 0; }
    .resume { margin-top: 0.5rem; }
    nav { margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>📰 Veille IA Marketing</h1>
  <nav>
    <button onclick="sortBy('date')">Trier par date</button>
    <button onclick="sortBy('categorie')">Trier par catégorie</button>
    <button onclick="sortBy('outil')">Trier par outil</button>
  </nav>

  <div id="articles-container"></div>

  <script>
    const articlesDataOriginal = [
${htmlArticles}
    ];

    let articles = [...articlesDataOriginal];

    function renderArticles() {
      const container = document.getElementById("articles-container");
      container.innerHTML = "";
      for (const article of articles) {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = \`
          <div class="titre"><a href="\${article.url}" target="_blank">\${article.titre}</a></div>
          <div class="date">📅 \${article.date}</div>
          <div class="categorie">📁 \${article.categorie}</div>
          <div class="outil">🛠️ \${article.outil}</div>
          <div class="resume">\${article.resume}</div>
        \`;
        container.appendChild(div);
      }
    }

    function sortBy(field) {
      articles.sort((a, b) => a[field].localeCompare(b[field]));
      renderArticles();
    }

    renderArticles();
  </script>

  <footer style="margin-top: 2rem; font-size: 0.8rem; color: #777;">
    Dernière mise à jour automatique : ${new Date().toISOString().split('T')[0]}
  </footer>
</body>
</html>
`;

  await fs.writeFile('./veille.html', htmlTemplate, 'utf-8');
  console.log('✅ veille.html mis à jour avec succès !');

} catch (error) {
  console.error('❌ Erreur générale :', error);
  process.exit(1);
}
