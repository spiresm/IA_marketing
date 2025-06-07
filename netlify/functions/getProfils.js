const fs = require("fs");
const path = require("path");

exports.handler = async function () {
  try {
    const filePath = path.resolve(__dirname, "./profil.json"); // Chemin local dans le même dossier
    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Erreur lecture profil.json",
        details: err.message
      })
    };
  }
};
