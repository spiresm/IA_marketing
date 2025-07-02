// netlify/functions/uploadMedia.js

exports.handler = async (event, context) => {
    // Log dès le début pour vérifier l'invocation
    console.log("--- uploadMedia function: Début d'invocation ---");
    console.log("Méthode HTTP:", event.httpMethod);
    console.log("Corps de la requête (longueur):", event.body ? event.body.length : 0);

    try {
        // Tente de parser le corps pour voir s'il y a des erreurs immédiates
        const data = JSON.parse(event.body);
        console.log("Données parsées avec succès:", Object.keys(data));
    } catch (parseError) {
        console.error("Erreur de parsing dans le test minimal:", parseError);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Test minimal: Erreur de parsing - ${parseError.message}` }),
        };
    }

    // Retourne une réponse de succès factice
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Test minimal: Fonction invoquée avec succès." }),
    };
};
