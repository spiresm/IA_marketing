const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../../demandes.json');

exports.handler = async () => {
  try {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    const data = JSON.parse(content);
    // data est supposé être un tableau
    return {
      statusCode: 200,
      body: JSON.stringify(Array.isArray(data) ? data : []),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lecture fichier', details: error.message }),
    };
  }
};
