// maj-veille.js
import fs from 'fs';
import dayjs from 'dayjs';

const articles = JSON.parse(fs.readFileSync('./articles-formattes.json', 'utf-8'));

// Trier les articles du plus récent au plus ancien
articles.sort((a, b) => new Date(b.date) - new Date(a.date));

// Générer les blocs HTML pour chaque article
const articleCards = articles.map(article => `
  <div class="card">
    <h2>${article.titre}</h2>
    <p><strong>${article.date}</strong> – <em>${article.outil}</em> – <span class="tag">${article.categorie}</span></p>
    <p>${article.resume}</p>
    <a href="${article.url}" target="_blank">Lire l’article →</a>
    <p class="source">Source : ${article.source}</p>
  </div>
`).join('\n');

// Injecter le HTML complet avec design
const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Veille IA Marketing</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; background: #f9f9f9; }
    h1 { text-align: center; margin-bottom: 2rem; }
    .filters, .pagination, .sort { margin-bottom: 1.5rem; text-align: center; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); padding: 1rem 1.5rem; margin-bottom: 1.5rem; }
    .card h2 { margin: 0.2rem 0; }
    .tag { background: #e0e0e0; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.8rem; }
    .source { font-size: 0.8rem; color: #555; margin-top: 0.5rem; }
    a { color: #007acc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📰 Veille IA & Marketing</h1>

  <div class="filters">
    <!-- futurs filtres ici -->
  </div>

  <div class="sort">
    <!-- futur tri ici -->
  </div>

  ${articleCards}

  <div class="pagination">
    <!-- future pagination -->
  </div>

  <footer style="text-align: center; margin-top: 4rem; font-size: 0.9rem; color: #888;">
    Mis à jour automatiquement le ${dayjs().format('YYYY-MM-DD')}
  </footer>
</body>
</html>
`;

// Écrire le fichier HTML final
fs.writeFileSync('./veille.html', htmlContent);
console.log('✅ veille.html généré avec succès !');
