// netlify/functions/getprofils.js - VERSION DE TEST MINIMALISTE

exports.handler = async function (event, context) {
  console.log("TEST-GETPROFILS: Fonction getprofils démarrée.");

  try {
    // Tente juste de retourner un JSON de base
    const testData = [
      { id: "test1", name: "Test Profil 1", pole: "Test", note: "Ceci est un test." },
      { id: "test2", name: "Test Profil 2", pole: "Autre", note: "Le proxy fonctionne !" }
    ];

    console.log("TEST-GETPROFILS: Envoi de données de test.");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(testData),
    };

  } catch (error) {
    console.error("TEST-GETPROFILS: Erreur imprévue dans le test simple:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur interne de la fonction de test." }),
    };
  }
};
