import fs from 'fs/promises';
import path from 'path';

const INPUT_FILE = './articles-formattes.json';
const OUTPUT_FILE = './veille.html';

function getSourceFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return 'source inconnue';
  }
}

function groupArticles(articles) {
  const byCategorie = {};
  const byOutil = {};
  const selected = [];

  for (const article of articles) {
    const { categorie, outil } = article;

    // Catégories
    if (!byCategorie[categorie]) byCategorie[categorie] = [];
    if (byCategorie[categorie].length < 2) {
      byCategorie[categorie].push(article);
      selected.push(article);
    }

    // Outils
    if (!byOutil[outil]) {
      byOutil[outil] = article;
    }
  }

  // Ajoute un article par outil s'il n'est pas déjà dans la liste
  Object.values(byOutil).forEach(article => {
    if (!selected.includes(article)) {
      selected.push(article);
    }
  });

  return selected;
}

function renderArticle(article) {
  const { titre, url, outil, categorie, date, resume } = article;
  const source = getSourceFromUrl(url);
  return `{titre:"${titre}", url:"${url}", outil:"${outil}", categorie:"${categorie}", date:"${date}", resume:"${resume} (source: ${source})"}`;
}

function injectIntoTemplate(articlesJs) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Veille IA</title>
</head>
<body>
  <h1>Articles de veille IA</h1>
  <script>
    const articlesDataOriginal = [
      ${articlesJs.join(',\n      ')}
    ];
    // pagination, rendu, etc...
  </script>
  <!-- MAJ AUTO : ${new Date().toISOString()} -->
</body>
</html>`;
}

async function main() {
  console.log('⏳ Lecture des articles…');
  const data = await fs.readFile(INPUT_FILE, 'utf-8');
  const articles = JSON.parse(data);

  const filtered = groupArticles(articles);
  const articlesJs = filtered.map(renderArticle);
  const html = injectIntoTemplate(articlesJs);

  await fs.writeFile(OUTPUT_FILE, html, 'utf-8');
  console.log('✅ veille.html mis à jour !');
}

main().catch(err => {
  console.error('❌ Erreur mise à jour veille.html :', err.message);
  process.exit(1);
});

