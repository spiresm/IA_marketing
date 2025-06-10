const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const pages = [
  { url: 'https://ton-site.netlify.app/index.html', nom: 'Accueil' },
  { url: 'https://ton-site.netlify.app/aide.html', nom: 'Aide' },
  { url: 'https://ton-site.netlify.app/faq.html', nom: 'FAQ' }
];

async function extraireContenu(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const texte = $('body').text().replace(/\s+/g, ' ').trim();
    return texte.slice(0, 4000); // limite le texte à 4000 caractères max
  } catch (e) {
    console.error(`❌ Erreur lors de l'extraction depuis ${url} :`, e.message);
    return '';
  }
}

async function construireBase() {
  const base = [];

  for (const page of pages) {
    console.log(`🔎 Traitement de : ${page.nom}`);
    const contenu = await extraireContenu(page.url);
    base.push({
      titre: page.nom,
      url: page.url,
      contenu
    });
  }

  fs.writeFileSync('connaissances.json', JSON.stringify(base, null, 2), 'utf-8');
  console.log('✅ Fichier connaissances.json généré !');
}

construireBase();
