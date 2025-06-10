console.log("✅ Le script démarre");

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
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

    // Logique d'extraction spécifique pour la page FAQ
    if (url.includes('faq.html')) {
      let contenuFaq = [];
      // Cibler toutes les sections de FAQ (faq-page-1, faq-page-2, etc.)
      $('div.faq-page').each((index, pageElement) => {
        $(pageElement).find('details.card').each((i, element) => {
          const question = $(element).find('summary').text().replace(/\s+/g, ' ').trim();
          const reponse = $(element).find('p').text().replace(/\s+/g, ' ').trim();

          if (question && reponse) {
            contenuFaq.push(`Question: ${question}\nRéponse: ${reponse}`);
          }
        });
      });
      texteExtrait = contenuFaq.join('\n\n---\n\n'); // Séparer les FAQ par un délimiteur clair
    } else {
      // Logique d'extraction générique pour les autres pages
      // On tente de cibler le contenu principal, en évitant les éléments de navigation ou de pied de page.
      // Vous pourriez avoir besoin d'affiner davantage ces sélecteurs si le contenu reste incomplet.
      // Exemples de sélecteurs plus précis pour d'autres pages :
      // $('article.main-content').text() ou $('div#page-body').text()
      texteExtrait = $('main, article, .container').text().replace(/\s+/g, ' ').trim();
    }

    // On limite le texte à une taille raisonnable pour le chatbot
    // Le 8000 est une suggestion, vous pouvez l'ajuster ou le supprimer.
    return texteExtrait.slice(0, 8000); 

  } catch (e) {
    console.error(`❌ Erreur lors de l'extraction de ${url} :`, e.message);
    return ''; // Retourne une chaîne vide en cas d'erreur
  }
}

async function construireBase() {
  const base = [];
  const connaissancesFilePath = path.resolve(__dirname, 'connaissances.json');

  for (const page of pages) {
    console.log(`🔎 Extraction de : ${page.nom} (${page.url})`);
    const contenu = await extraireContenu(page.url);

    if (!contenu || contenu.length < 50) {
      console.warn(`⚠️ Contenu insuffisant pour ${page.nom} (${contenu.length} caractères)`);
    } else {
      console.log(`✅ ${page.nom} — extrait ${contenu.length} caractères`);
      // Affiche un aperçu du contenu extrait pour faciliter le débogage
      console.log(`🧪 Aperçu : ${contenu.substring(0, Math.min(contenu.length, 200))}...\n`);
    }

    base.push({
      titre: page.nom,
      url: page.url,
      contenu: contenu
    });
  }

  try {
    fs.writeFileSync(connaissancesFilePath, JSON.stringify(base, null, 2), 'utf-8');
    console.log(`✅ Fichier connaissances.json mis à jour à : ${connaissancesFilePath}`);
  } catch (error) {
    console.error(`❌ Erreur critique lors de l'écriture du fichier connaissances.json :`, error);
  }
}

// Lance le processus de construction de la base de connaissances
construireBase();
