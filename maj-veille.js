// maj-veille.js
import fs from 'fs';
import dayjs from 'dayjs';

const INPUT_PATH = './articles-formattes.json';
const OUTPUT_PATH = './veille.html';

console.log('⏳ Lecture des articles enrichis...');

let articles = [];
try {
  articles = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
} catch (err) {
  console.error('❌ Erreur lecture ou parsing articles-formattes.json :', err.message);
  process.exit(1);
}

// Regroupe par catégorie et outil
const categories = {};
const outils = {};

for (const article of articles) {
  if (!categories[article.categorie]) categories[article.categorie] = [];
  if (!outils[article.outil]) outils[article.outil] = [];
  categories[article.categorie].push(article);
  outils[article.outil].push(article);
}

// Échantillonne 2 articles par catégorie et 1 article par outil
const finalArticles = [];
for (const cat of Object.keys(categories)) {
  finalArticles.push(...categories[cat].slice(0, 2));
}
for (const tool of Object.keys(outils)) {
  const [first] = outils[tool];
  if (!finalArticles.includes(first)) finalArticles.push(first);
}

// Génère le HTML
const articlesHTML = finalArticles.map(a => `
  <div class="card">
    <h3>${a.titre}</h3>
    <p><strong>${a.date}</strong> – ${a.resume}</p>
    <p><strong>Outil :</strong> ${a.outil} – <strong>Catégorie :</strong> ${a.categorie}</p>
    <p><strong>Source :</strong> <a href="${a.url}" target="_blank">${a.source}</a></p>
  </div>
`).join('\n');

const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Veille IA Marketing</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f4f4f4; }
    h1 { text-align: center; }
    .card {
      background: white;
      padding: 1rem;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <h1>Veille IA Marketing</h1>
  ${articlesHTML}
  <footer style="text-align:center;margin-top:2rem;font-size:0.8rem;">Dernière mise à jour : ${dayjs().format('YYYY-MM-DD HH:mm')}</footer>
</body>
</html>`;

fs.writeFileSync(OUTPUT_PATH, htmlTemplate);
console.log('✅ veille.html généré avec succès !');
