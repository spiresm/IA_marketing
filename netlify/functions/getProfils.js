// netlify/functions/getProfils.js - VERSION ULTRA-SIMPLIFIÉE POUR DÉBOGAGE PROFOND

exports.handler = async function (event, context) {
  console.log("DEBUG: La fonction getProfils.js a DEMARRÉ.");

  try {
    const testData = {
      message: "DEBUG: La fonction getProfils a réussi à s'exécuter.",
      timestamp: new Date().toISOString(),
      receivedMethod: event.httpMethod,
      receivedPath: event.path
    };
    console.log("DEBUG: Préparation de la réponse 200.");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(testData),
    };
  } catch (err) {
    // Ce bloc devrait être atteint si une erreur survient DANS le try
    console.error("DEBUG: Erreur imprévue dans la fonction getProfils:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "DEBUG: Erreur interne de la fonction simple de test.",
        details: err.message,
      }),
    };
  }
};
