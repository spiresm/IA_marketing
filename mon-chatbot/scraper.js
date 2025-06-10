console.log("✅ Le script démarre");

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const pages = [
  { url: 'https://iamarketing.netlify.app/index.html', nom: 'Accueil' },
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
    const texte = $('main, section, .tile, article, body').text().replace(/\s+/g, ' ').trim();
    return texte.slice(0, 4000);
  } catch (e) {
    console.error(`❌ Erreur lors de l'extraction de ${url} :`, e.message);
    return '';
  }
}

async function construireBase() {
  const base = [];

  for (const page of pages) {
    console.log(`🔎 Extraction de : ${page.nom} (${page.url})`);
    const contenu = await extraireContenu(page.url);

    if (!contenu || contenu.length < 50) {
      console.warn(`⚠️ Contenu insuffisant pour ${page.nom} (${contenu.length} caractères)`);
    } else {
      console.log(`✅ ${page.nom} — extrait ${contenu.length} caractères`);
      console.log(`🧪 Aperçu : ${contenu.substring(0, 120)}...\n`);
    }

    base.push({
      titre: page.nom,
      url: page.url,
      contenu
    });
  }

  fs.writeFileSync('connaissances.json', JSON.stringify(base, null, 2), 'utf-8');
  console.log('✅ Fichier connaissances.json mis à jour avec toutes les pages.');
}

construireBase();
