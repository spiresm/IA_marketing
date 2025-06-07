const fs = require("fs");
const path = require("path");

const SOURCE_PATH = path.join(__dirname, "../../demandes.json");
const TMP_PATH = "/tmp/demandes.json";

exports.handler = async function () {
  try {
    let data = "[]";

    if (fs.existsSync(TMP_PATH)) {
      data = fs.readFileSync(TMP_PATH, "utf-8");
    } else if (fs.existsSync(SOURCE_PATH)) {
      data = fs.readFileSync(SOURCE_PATH, "utf-8");
    }

    return {
      statusCode: 200,
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur lecture",
        details: err.message
      })
    };
  }
};
