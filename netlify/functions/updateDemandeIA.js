const fs = require("fs");
const path = require("path");

const SOURCE_PATH = path.join(__dirname, "../../demandes.json");
const TMP_PATH = "/tmp/demandes.json";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée"
    };
  }

  try {
    const body = JSON.parse(event.body);
    let demandes = [];

    // Lire depuis le fichier original (lecture seule)
    if (fs.existsSync(TMP_PATH)) {
      demandes = JSON.parse(fs.readFileSync(TMP_PATH, "utf-8"));
    } else if (fs.existsSync(SOURCE_PATH)) {
      demandes = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf-8"));
    }

    // Si body est un tableau (écrasement complet)
    if (Array.isArray(body)) {
      demandes = body;
    } else {
      const index = demandes.findIndex(d => d.id === body.id);
      if (index > -1) {
        demandes[index] = { ...demandes[index], ...body };
      } else {
        demandes.push(body);
      }
    }

    fs.writeFileSync(TMP_PATH, JSON.stringify(demandes, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, total: demandes.length })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur d’écriture",
        details: err.message
      })
    };
  }
};
