const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../demandes.json"); // <== racine du projet

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const newDemande = JSON.parse(event.body);

  try {
    let demandes = [];
    if (fs.existsSync(FILE_PATH)) {
      demandes = JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
    }

    const index = demandes.findIndex(d => d.id === newDemande.id);
    if (index > -1) {
      demandes[index] = { ...demandes[index], ...newDemande };
    } else {
      demandes.push(newDemande);
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur écriture fichier", details: err.message })
    };
  }
};
