exports.handler = async function (event) {
  console.log("✅ pushPrompt appelée !");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Fonction appelée avec succès" })
  };
};
