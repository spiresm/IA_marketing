const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../../data/demandes.json');

exports.handler = async () => {
  try {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    const demandes = JSON.parse(content);
    return {
      statusCode: 200,
      body: JSON.stringify(demandes),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lecture fichier', details: error.message }),
    };
  }
};
