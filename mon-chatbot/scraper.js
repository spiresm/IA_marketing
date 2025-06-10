const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const pages = [
  { url: 'https://iamarketing.netlify.app/.html', nom: 'Accueil' },
  { url: 'https://iamarketing.netlify.app//chatbot.html', nom: 'Chatbot' }
  { url: 'https://iamarketing.netlify.app/outils.html', nom: 'outils' }
  { url: 'https://iamarketing.netlify.app/cas-usages', nom: 'cas-usages' }
  { url: 'https://iamarketing.netlify.app/equipe', nom: 'equipe' }
  { url: 'https://iamarketing.netlify.app/galerie', nom: 'galerie' }
  { url: 'https://iamarketing.netlify.app/charte', nom: 'charte' }
  { url: 'https://iamarketing.netlify.app/faq', nom: 'faq' }

];

async function extraireContenu(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const texte = $('body').text().replace(/\s+/g, ' ').trim();
    return texte.slice(0, 4000);
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
