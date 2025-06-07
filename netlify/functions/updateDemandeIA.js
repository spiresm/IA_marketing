const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../demandes.json");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée"
    };
  }

  let input;
  try {
    input = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Données JSON invalides" })
    };
  }

  let demandes = [];
  try {
    if (fs.existsSync(FILE_PATH)) {
      const content = fs.readFileSync(FILE_PATH, "utf-8");
      demandes = JSON.parse(content);
      if (!Array.isArray(demandes)) demandes = [];
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture", details: err.message })
    };
  }

  // 🔧 Traitement en fonction du type de données reçues
  if (Array.isArray(input)) {
    demandes = input; // Remplacer tout (utilisé pour suppression)
  } else if (typeof input === "object" && input.id) {
    const index = demandes.findIndex(d => d.id === input.id);
    if (index !== -1) {
      demandes[index] = { ...demandes[index], ...input };
    } else {
      demandes.push(input);
    }
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Format de données invalide" })
    };
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2), "utf-8");
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, total: demandes.length })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur écriture", details: err.message })
    };
  }
};
