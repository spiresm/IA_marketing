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

  let newDemande;
  try {
    newDemande = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Données JSON invalides" })
    };
  }

  if (!newDemande.nom || !newDemande.date) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Champs requis manquants" })
    };
  }

  let demandes = [];

  try {
    if (fs.existsSync(FILE_PATH)) {
      const content = fs.readFileSync(FILE_PATH, "utf-8");
      demandes = JSON.parse(content);
      if (!Array.isArray(demandes)) {
        demandes = [];
      }
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur de lecture", details: err.message })
    };
  }

  const id = newDemande.id || "_" + Math.random().toString(36).substr(2, 9);
  const index = demandes.findIndex(d => d.id === id);

  if (index > -1) {
    demandes[index] = { ...demandes[index], ...newDemande };
  } else {
    demandes.push({ ...newDemande, id });
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2), "utf-8");
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id, updatedAt: Date.now() })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur d'écriture", details: err.message })
    };
  }
};
