const fs = require("fs");
const path = require("path");

const TMP_PATH = "/tmp/demandes.json";
const FALLBACK_PATH = path.join(__dirname, "../../demandes.json");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Méthode non autorisée" };
  }

  try {
    const newData = JSON.parse(event.body);
    let demandes = [];

    if (fs.existsSync(TMP_PATH)) {
      demandes = JSON.parse(fs.readFileSync(TMP_PATH, "utf8"));
    } else if (fs.existsSync(FALLBACK_PATH)) {
      demandes = JSON.parse(fs.readFileSync(FALLBACK_PATH, "utf8"));
    }

    if (Array.isArray(newData)) {
      demandes = newData;
    } else {
      const index = demandes.findIndex(d => d.id === newData.id);
      if (index !== -1) {
        demandes[index] = { ...demandes[index], ...newData };
      } else {
        demandes.push(newData);
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
      body: JSON.stringify({ error: "Erreur écriture", details: err.message })
    };
  }
};
