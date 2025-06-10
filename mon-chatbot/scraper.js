const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

console.log("✅ Le script démarre !");

const pages = [
  { url: 'https://iamarketing.netlify.app/index.html', nom: 'Accueil' },
  { url: 'https://iamarketing.netlify.app/chatbot.html', nom: 'Chatbot' },
  { url: 'https://iamarketing.netlify.app/outils.html', nom: 'Outils' },
  { url: 'https://iamarketing.netlify.app/cas-usages', nom: 'Cas d’usage' },
  { url: 'https://iamarketing.netlify.app/equipe', nom: 'Équipe' },
  { url: 'https://iamarketing.netlify.app/galerie', nom: 'Galerie' },
  { url: 'https://iamarketing.netlify.app/charte', nom: 'Charte' },
  { url: 'https://iamarketing.netlify.app/faq', nom: 'FAQ' }
];

async function extraireContenu(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const texte = $('body').text().replace(/\s+/g, ' ').trim();
    return texte.slice(0, 4000);
  } catch (e) {
    console.error(`❌ Erreur lors du scraping de ${url} :`, e.message);
    return '';
  }
}

async function construireBase() {
  const base = [];

  for (const page of pages) {
    console.log(`🔎 Scraping : ${page.nom} - ${page.url}`);
    const contenu = await extraireContenu(page.url);
    base.push({
      titre: page.nom,
      url: page.url,
      contenu
    });
  }

  fs.writeFileSync('connaissances.json', JSON.stringify(base, null, 2), 'utf-8');
  console.log('✅ connaissances.json généré !');
}

construireBase();
