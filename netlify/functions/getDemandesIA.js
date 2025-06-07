const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../demandes.json"); // <== racine du projet

exports.handler = async function () {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, "[]");
    }

    const data = fs.readFileSync(FILE_PATH, "utf-8");
    const demandes = JSON.parse(data);
    return {
      statusCode: 200,
      body: JSON.stringify(demandes)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture fichier", details: err.message })
    };
  }
};
