const fs = require('fs');
const path = require('path');

// NOUVEAU CHEMIN CORRECT
// `__dirname` est le répertoire de `getDemandesCount.js`
// `data` est maintenant un sous-dossier DIRECTEMENT dans le même répertoire que `getDemandesCount.js`
// Donc, pas besoin de '../'
const FILE_PATH = path.join(__dirname, 'data', 'demandes.json');

exports.handler = async () => {
  try {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    const demandes = JSON.parse(content);
    return {
      statusCode: 200,
      headers: { // IMPORTANT: Assurez-vous que ces headers sont là
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(demandes),
    };
  } catch (error) {
    // Cela loguera l'erreur exacte sur Netlify dans les logs de la fonction
    console.error("Erreur lors de la lecture ou du parsing de demandes.json:", error);
    return {
      statusCode: 500,
      headers: { // IMPORTANT: Ajoutez aussi les headers CORS pour les erreurs
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: 'Erreur lecture fichier', details: error.message }),
    };
  }
};
