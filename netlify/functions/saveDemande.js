const fs = require("fs");
const path = require("path");

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    const filePath = path.resolve("/tmp", "demandes.json");
    let existing = [];

    // Lire les demandes existantes s'il y en a
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      existing = JSON.parse(content);
    }

    existing.push(data);

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Demande sauvegardée avec succès" }),
    };
  } catch (error) {
    console.error("Erreur:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erreur serveur" }),
    };
  }
};
