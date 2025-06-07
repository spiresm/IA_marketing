const fs = require("fs");
const path = require("path");

exports.handler = async function () {
  try {
    const filePath = path.resolve(__dirname, "../../profil.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    // Vérifie que le JSON a bien une propriété "profils" qui est un tableau
    if (!parsed || !Array.isArray(parsed.profils)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Le fichier profil.json ne contient pas un tableau 'profils' valide." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lecture profil.json", details: err.message })
    };
  }
};
