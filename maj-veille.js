import fs from 'fs';

const filePath = './veille.html';
const articlesPath = './articles-formattes.json';

try {
  // Lire les articles formatés
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

  // Créer la chaîne à injecter dans veille.html
  const newContent = `const articlesDataOriginal = ${JSON.stringify(articles, null, 2)};`;

  // Lire veille.html
  let html = fs.readFileSync(filePath, 'utf-8');

  // Remplacer le contenu existant des articles
  html = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

  // Ajouter une ligne de commentaire avec la date de mise à jour
  const dateComment = `<!-- MAJ AUTO : ${new Date().toISOString()} -->`;
  html = html.replace(/<!-- MAJ AUTO : .*? -->/, dateComment);

  // Écrire le nouveau contenu dans veille.html
  fs.writeFileSync(filePath, html, 'utf-8');

  console.log("✅ veille.html mise à jour !");
} catch (err) {
  console.error("❌ Erreur mise à jour veille.html :", err.message || err);
}
