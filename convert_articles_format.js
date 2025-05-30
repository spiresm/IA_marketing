import fs from 'fs';

// Lis les articles bruts
const raw = JSON.parse(fs.readFileSync('./raw-articles.json', 'utf-8'));

// Transforme les articles selon le format attendu
const formatted = raw.map(article => ({
  titre: article.titre,
  url: article.url,
  outil: article.outil || "Inconnu",
  categorie: article.categorie || "Général",
  date: article.date || new Date().toISOString().split('T')[0],
  resume: article.resume || "Aucun résumé disponible."
}));

// Écrit le fichier formaté
fs.writeFileSync('./articles-formattes.json', JSON.stringify(formatted, null, 2), 'utf-8');

console.log("✅ Fichier articles-formattes.json généré avec succès !");
