const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

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
    let texteExtrait = '';

    if (url.includes('faq.html')) {
      let contenuFaq = [];
      $('div.faq-page').each((_, pageElement) => {
        $(pageElement).find('details.card').each((__, element) => {
          const question = $(element).find('summary').text().replace(/\s+/g, ' ').trim();
          const reponse = $(element).find('p').text().replace(/\s+/g, ' ').trim();
          if (question && reponse) {
            contenuFaq.push(`Question: ${question}\nRéponse: ${reponse}`);
          }
        });
      });
      texteExtrait = contenuFaq.join('\n\n---\n\n');
    } else {
      texteExtrait = $('main, article, .container').text().replace(/\s+/g, ' ').trim();
    }

    return texteExtrait.slice(0, 8000); // Limite de sécurité
  } catch (e) {
    console.error(`❌ Erreur lors de l'extraction de ${url} :`, e.message);
    return '';
  }
}

async function construireBase() {
  const base = [];
  const connaissancesFilePath = path.resolve(__dirname, 'connaissances.json');

  for (const page of pages) {
    console.log(`🔎 Extraction de : ${page.nom} (${page.url})`);
    const contenu = await extraireContenu(page.url);

    if (!contenu || contenu.length < 50) {
      console.warn(`⚠️ Contenu insuffisant pour ${page.nom} (${contenu.length} caractères).`);
      console.warn(`🧪 Aperçu insuffisant : ${contenu.substring(0, 100)}...\n`);
    } else {
      console.log(`✅ ${page.nom} — extrait ${contenu.length} caractères.`);
      console.log(`🧪 Aperçu : ${contenu.substring(0, 200)}...\n`);
    }

    base.push({
      titre: page.nom,
      url: page.url,
      contenu: contenu
    });
  }

  console.log(`📊 Taille de la base de données collectée : ${base.length} pages.`);

  if (base.length === 0) {
    console.error("❌ La base de données 'base' est vide. Le fichier connaissances.json ne sera pas mis à jour.");
    return;
  }

  const jsonString = JSON.stringify(base, null, 2);
  console.log(`📏 Taille des données JSON à écrire : ${jsonString.length} caractères.`);
  console.log(`📝 Début de l'écriture du fichier : ${connaissancesFilePath}`);

  try {
    await fs.unlink(connaissancesFilePath).catch(e => {
      if (e.code !== 'ENOENT') {
        console.warn(`⚠️ Impossible de supprimer l'ancien fichier :`, e.message);
      } else {
        console.log(`🗑️ Ancien fichier non trouvé (OK, il sera créé).`);
      }
    });

    await fs.writeFile(connaissancesFilePath, jsonString, 'utf-8');
    console.log(`✅ Fichier connaissances.json mis à jour avec succès à : ${connaissancesFilePath}`);
  } catch (error) {
    console.error(`❌ Erreur CRITIQUE lors de l'écriture du fichier :`, error);
  }
}

construireBase();
