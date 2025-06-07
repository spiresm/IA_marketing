const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../data/demandes.json");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  try {
    const body = JSON.parse(event.body);
    let demandes = [];

    if (fs.existsSync(FILE_PATH)) {
      const content = fs.readFileSync(FILE_PATH, "utf-8");
      demandes = JSON.parse(content);
    }

    if (Array.isArray(body)) {
      // Si on envoie un tableau complet (pour suppression ou reset)
      demandes = body;
    } else {
      const newDemande = body;
      const index = demandes.findIndex(d => d.id === newDemande.id);

      if (index > -1) {
        demandes[index] = { ...demandes[index], ...newDemande };
      } else {
        demandes.push(newDemande);
      }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, total: demandes.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur écriture", details: err.message }),
    };
  }
};
