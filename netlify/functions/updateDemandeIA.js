const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../data/demandesIA.json");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  const newDemande = JSON.parse(event.body);
  if (!newDemande.nom || !newDemande.date) {
    return { statusCode: 400, body: "Champs requis manquants" };
  }

  let demandes = [];
  try {
    if (fs.existsSync(FILE_PATH)) {
      const content = fs.readFileSync(FILE_PATH, "utf-8");
      demandes = JSON.parse(content);
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur lecture" }) };
  }

  const id = newDemande.id || "_" + Math.random().toString(36).substr(2, 9);
  const index = demandes.findIndex(d => d.id === id);

  if (index > -1) {
    demandes[index] = { ...demandes[index], ...newDemande };
  } else {
    demandes.push({ ...newDemande, id });
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id, triggerTime: Date.now() })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur écriture" }) };
  }
};
