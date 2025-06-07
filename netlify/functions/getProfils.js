const fs = require("fs");
const path = require("path");

exports.handler = async function () {
  try {
    const filePath = path.resolve(__dirname, "../../profil.json");
    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data); // ✅ on parse ici

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed) // ✅ on stringify à nouveau pour envoyer
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur lecture profil.json",
        details: err.message
      })
    };
  }
};
