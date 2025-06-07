const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../../demandes.json");

exports.handler = async function () {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    const content = fs.readFileSync(FILE_PATH, "utf-8");
    const data = JSON.parse(content);

    return {
      statusCode: 200,
      body: JSON.stringify(Array.isArray(data) ? data : [])
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur de lecture des demandes",
        details: err.message
      })
    };
  }
};
