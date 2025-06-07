const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../../demandes.json');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  try {
    const newDemande = JSON.parse(event.body);

    let content = fs.readFileSync(FILE_PATH, 'utf-8');
    let data = JSON.parse(content);

    if (!data.demandes) {
      data.demandes = [];
    }

    const index = data.demandes.findIndex(d => d.id === newDemande.id);

    if (index > -1) {
      data.demandes[index] = { ...data.demandes[index], ...newDemande };
    } else {
      data.demandes.push(newDemande);
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur écriture', details: error.message }),
    };
  }
};
