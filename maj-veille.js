import fs from 'fs';

const filePath = './veille.html';
const data = JSON.parse(fs.readFileSync('./articles-formattes.json', 'utf-8'));

const newContent = `const articlesDataOriginal = ${JSON.stringify(data, null, 2)};`;
let html = fs.readFileSync(filePath, 'utf-8');

html = html.replace(/const articlesDataOriginal = \[[\s\S]*?\];/, newContent);

// ajoute une ligne de commentaire indiquant la date de mise à jour
html = html.replace(/<!-- MAJ AUTO : .* -->/, `<!-- MAJ AUTO : ${new Date().toISOString()} -->`);

fs.writeFileSync(filePath, html, 'utf-8');

console.log("✅ veille.html mise à jour !");
