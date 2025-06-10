// netlify/functions/getDemandesCount.js (ou fonctions/getDemandesCount.js)

exports.handler = async (event, context) => {
  console.log('Fonction de test simple démarrée avec succès.'); // Ceci DOIT apparaître dans les logs

  try {
    const testCount = 5; // Un nombre fixe pour le test

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ count: testCount }), // Renvoie { count: 5 }
    };
  } catch (error) {
    console.error("Erreur inattendue dans la fonction de test:", error); // Cela ne devrait pas se déclencher
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: 'Erreur inattendue dans la fonction de test simple.' }),
    };
  }
};
