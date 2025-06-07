const fs = require("fs");
const path = require("path");

exports.handler = async function () {
  try {
    const filePath = path.resolve(__dirname, "../../profil.json");
    const data = fs.readFileSync(filePath, "utf8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture profil.json", details: err.message })
    };
  }
};
