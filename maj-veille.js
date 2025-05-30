import fs from 'fs';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const filePath = './veille.html';
const articlesInputPath = './articles-formattes.json';

async function updateVeille() {
  try {
    console.log('⏳ Chargement des articles...');
    const rawArticles = JSON.parse(fs.readFileSync(articlesInputPath, 'utf-8'));

    const instructions = `Garde uniquement 2 articles par catégorie (les plus récents) et un article par outil (si possible différent de ceux retenus dans les catégories). Chaque article doit inclure : 
- un titre clair
- un résumé concis
- une date
- un outil
- une catégorie
- une source (nom du site)
- une URL valide

Retourne un tableau JSON d'objets JavaScript bien formés avec ces propriétés : titre, resume, date, outil, categorie, source, url. Ne fais pas de phrase autour. Ne retourne que le tableau.`;

    console.log('⏳ Appel à l’API OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Tu es un assistant qui aide à filtrer et structurer des articles pour une page de veille.' },
        { role: 'user', content: `${instructions}\n\n${JSON.stringify(rawArticles, null, 2)}` }
      ],
      temperature: 0.7
    });

    const jsonText = completion.choices[0].message.content.trim();
    const articles = JSON.parse(jsonText);
    console.log('✅ Articles filtrés reçus');

    const articlesJs = articles.map(article => JSON.stringify(article, null, 2));
    const newHtml = injectIntoTemplate(articlesJs);
    fs.writeFileSync(filePath, newHtml, 'utf-8');

    console.log('✅ veille.html mise à jour !');
  } catch (err) {
    console.error('❌ Erreur mise à jour veille.html :', err.message || err);
  }
}

function injectIntoTemplate(articlesJs) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Veille IA</title>
  <style>
    body { font-family: Arial; padding: 2rem; background: #f5f5f5; color: #333; }
    .article { margin-bottom: 1.5rem; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
    .article h3 { margin: 0.2rem 0; }
    .article small { color: gray; }
    .pagination { margin-top: 2rem; }
    .pagination button { margin: 0 5px; padding: 5px 10px; }
  </style>
</head>
<body>
  <h1>Veille IA</h1>
  <div id="articles"></div>
  <div class="pagination">
    <button onclick="prevPage()">← Précédent</button>
    <span id="page-indicator"></span>
    <button onclick="nextPage()">Suivant →</button>
  </div>

  <script>
    const articlesDataOriginal = [
      ${articlesJs.join(',\n      ')}
    ];

    const articlesPerPage = 5;
    let currentPage = 1;

    function renderArticles() {
      const start = (currentPage - 1) * articlesPerPage;
      const end = start + articlesPerPage;
      const pageArticles = articlesDataOriginal.slice(start, end);

      const container = document.getElementById('articles');
      container.innerHTML = '';

      pageArticles.forEach(a => {
        const div = document.createElement('div');
        div.className = 'article';
        div.innerHTML = \`
          <h3><a href="\${a.url}" target="_blank">\${a.titre}</a></h3>
          <p>\${a.resume}</p>
          <small>\${a.date} – Outil : \${a.outil} – Catégorie : \${a.categorie} – Source : \${a.source}</small>
        \`;
        container.appendChild(div);
      });

      document.getElementById('page-indicator').textContent = 'Page ' + currentPage + ' / ' + Math.ceil(articlesDataOriginal.length / articlesPerPage);
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderArticles();
      }
    }

    function nextPage() {
      if (currentPage < Math.ceil(articlesDataOriginal.length / articlesPerPage)) {
        currentPage++;
        renderArticles();
      }
    }

    renderArticles();
  </script>

  <!-- MAJ AUTO : ${new Date().toISOString()} -->
</body>
</html>`;
}

updateVeille();
