console.log("✅ Le script démarre");


const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const pages = [
  { url: 'https://iamarketing.netlify.app/index.html', nom: 'Accueil' },
  { url: 'https://iamarketing.netlify.app/chatbot.html', nom: 'Chatbot' },
  { url: 'https://iamarketing.netlify.app/outils.html', nom: 'Outils' },
  { url: 'https://iamarketing.netlify.app/cas-usages.html', nom: 'Cas d’usage' },
  { url: 'https://iamarketing.netlify.app/equipe.html', nom: 'Équipe' },
  { url: 'https://iamarketing.netlify.app/galerie.html', nom: 'Galerie' },
  { url: 'https://iamarketing.netlify.app/charte.html', nom: 'Charte' },
  { url: 'https://iamarketing.netlify.app/faq.html', nom: 'FAQ' }
];

async function extraireContenu(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const texte = $('body').text().replace(/\s+/g, ' ').trim();
    return texte.slice(0, 4000); // coupe à 4000 caractères max
  } catch (e) {
    console.error(`❌ Erreur ${url} :`, e.message);
    return '';
  }
}

async function construireBase() {
  const base = [];

  for (const page of pages) {
    console.log(`🔎 Scraping : ${page.nom}`);
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
