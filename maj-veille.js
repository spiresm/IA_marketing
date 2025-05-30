// maj-veille.js
import fs from 'fs';
import dayjs from 'dayjs';

const INPUT_PATH = './articles-formattes.json';
const OUTPUT_PATH = './veille.html';

function generateHTML(articles) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Veille IA Marketing</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #f0f4f8; color: #333; }
    .header { background: #0077b6; color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 2em; }
    nav { background: #ffffff; display: flex; justify-content: center; gap: 20px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    nav a { text-decoration: none; color: #0077b6; font-weight: bold; padding: 8px 16px; border-radius: 20px; transition: background 0.3s; }
    nav a:hover { background-color: #e0f0ff; }
    .container { max-width: 1000px; margin: 40px auto; background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .filters { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-bottom: 20px; }
    .filters select, .filters input[type="search"] { padding: 10px; border-radius: 8px; border: 1px solid #ccc; background: #f9f9f9; min-width: 200px; }
    #sort-toggle { padding: 10px 20px; border-radius: 8px; border: 1px solid #ccc; background: #fff; cursor: pointer; }
    .article { display: flex; background: #e3f2fd; border-left: 5px solid #0077b6; border-radius: 10px; padding: 15px 20px; transition: background 0.3s; align-items: center; gap: 20px; margin-bottom: 10px; }
    .article:hover { background: #d0e8fc; }
    .article-date-block { background: #0077b6; color: #fff; font-weight: bold; font-size: 1em; padding: 6px 10px; border-radius: 8px; white-space: nowrap; }
    .article h2 { margin: 0; color: #005f8a; font-size: 1.2em; }
    .article .meta { font-size: 0.9em; color: #555; font-style: italic; margin-bottom: 10px; }
    #pagination { text-align: center; margin-top: 20px; }
    #pagination button { margin: 0 5px; padding: 8px 12px; border: none; background: #0077b6; color: #fff; border-radius: 6px; cursor: pointer; }
    #pagination button:disabled { background: #ccc; cursor: default; }
  </style>
</head>
<body>
  <div class="header"><h1>Espace IA Marketing</h1></div>
  <nav>
    <a href="index.html">Accueil</a>
    <a href="profil.html">Mon profil</a>
    <a href="outils.html">Outils IA</a>
    <a href="prompts.html">Prompts</a>
    <a href="cas-usages.html">Cas d’usage</a>
    <a href="creer-tip.html">Créer un tip</a>
    <a href="veille.html">Veille</a>
  </nav>

  <div class="container">
    <h1>Veille IA Marketing - Presse</h1>
    <div class="filters">
      <input type="search" id="search" placeholder="Rechercher un article..." oninput="renderArticles()">
      <select id="filtre-outil" onchange="renderArticles()">
        <option value="">Tous les outils</option>
        ${[...new Set(articles.map(a => a.outil))].map(o => `<option>${o}</option>`).join('')}
      </select>
      <select id="filtre-categorie" onchange="renderArticles()">
        <option value="">Toutes les catégories</option>
        ${[...new Set(articles.map(a => a.categorie))].map(c => `<option>${c}</option>`).join('')}
      </select>
      <button id="sort-toggle" onclick="toggleSortOrder()">Trier par date 📅 ↓</button>
    </div>
    <div id="articles"></div>
    <div id="pagination"></div>
  </div>

<script>
  const allArticles = ${JSON.stringify(articles)};
  let sortDescending = true;
  let currentPage = 1;
  const articlesPerPage = 5;

  function toggleSortOrder() {
    sortDescending = !sortDescending;
    document.getElementById('sort-toggle').textContent = `Trier par date 📅 ${sortDescending ? '↓' : '↑'}`;
    renderArticles();
  }

  function changePage(delta) {
    currentPage += delta;
    renderArticles();
  }

  function renderArticles() {
    const search = document.getElementById('search').value.toLowerCase();
    const outil = document.getElementById('filtre-outil').value;
    const cat = document.getElementById('filtre-categorie').value;

    let filtered = allArticles.filter(a => {
      return (!search || (a.titre + a.resume).toLowerCase().includes(search)) &&
             (!outil || a.outil === outil) &&
             (!cat || a.categorie === cat);
    });

    filtered.sort((a, b) => {
      const d1 = new Date(a.date), d2 = new Date(b.date);
      return sortDescending ? d2 - d1 : d1 - d2;
    });

    const container = document.getElementById('articles');
    const pagination = document.getElementById('pagination');
    container.innerHTML = '';
    pagination.innerHTML = '';

    const totalPages = Math.ceil(filtered.length / articlesPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * articlesPerPage;
    const pageArticles = filtered.slice(start, start + articlesPerPage);

    for (const article of pageArticles) {
      const div = document.createElement('div');
      div.className = 'article';
      div.innerHTML = `
        <div class="article-date-block">${article.date}</div>
        <div class="article-content">
          <h2><a href="${article.url}" target="_blank">${article.titre}</a></h2>
          <div class="meta">${article.outil} – ${article.categorie} – ${article.source}</div>
          <p>${article.resume}</p>
        </div>`;
      container.appendChild(div);
    }

    if (totalPages > 1) {
      pagination.innerHTML = `
        <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Précédent</button>
        Page ${currentPage} / ${totalPages}
        <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Suivant</button>
      `;
    }
  }

  renderArticles();
</script>
</body>
</html>`;

  return html;
}

function updateVeille() {
  try {
    const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
    const html = generateHTML(data);
    fs.writeFileSync(OUTPUT_PATH, html, 'utf-8');
    console.log('✅ veille.html mise à jour avec succès');
  } catch (err) {
    console.error('❌ Erreur mise à jour veille.html :', err.message);
    process.exit(1);
  }
}

updateVeille();
