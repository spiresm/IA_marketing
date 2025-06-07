const fs = require("fs");
const path = require("path");

const TMP_PATH = "/tmp/demandes.json";
const FALLBACK_PATH = path.join(__dirname, "../../demandes.json");

exports.handler = async function () {
  try {
    let data = "[]";

    if (fs.existsSync(TMP_PATH)) {
      data = fs.readFileSync(TMP_PATH, "utf-8");
    } else if (fs.existsSync(FALLBACK_PATH)) {
      data = fs.readFileSync(FALLBACK_PATH, "utf-8");
    }

    return {
      statusCode: 200,
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture", details: err.message })
    };
  }
};
