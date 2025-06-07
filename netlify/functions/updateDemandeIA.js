const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../data/demandes.json");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Requête JSON invalide" };
  }

  let demandes = [];
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, "utf-8");
      demandes = JSON.parse(data);
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur lecture fichier" }) };
  }

  // 🚨 Cas 1 : payload est un tableau (remplacement complet)
  if (Array.isArray(payload)) {
    demandes = payload;
  }
  // ✅ Cas 2 : payload est un objet (ajout ou mise à jour)
  else if (payload && payload.id) {
    const index = demandes.findIndex(d => d.id === payload.id);
    if (index >= 0) {
      demandes[index] = { ...demandes[index], ...payload };
    } else {
      demandes.push(payload);
    }
  } else {
    return { statusCode: 400, body: "Format de la demande invalide" };
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(demandes, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Erreur écriture fichier" }) };
  }
};
