const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../data/demandes.json");

exports.handler = async function () {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return { statusCode: 200, body: "[]" };
    }

    const content = fs.readFileSync(FILE_PATH, "utf-8");
    return {
      statusCode: 200,
      body: content,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture fichier", details: err.message }),
    };
  }
};
