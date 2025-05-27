exports.handler = async function (event) {
  console.log("✅ Fonction pushPrompt test appelée !");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Fonction test appelée avec succès" }),
  };
};
