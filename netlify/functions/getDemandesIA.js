const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../data/demandesIA.json");

exports.handler = async function(event) {
  try {
    const content = fs.readFileSync(FILE_PATH, "utf-8");
    return {
      statusCode: 200,
      body: content
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Impossible de lire les demandes" })
    };
  }
};
