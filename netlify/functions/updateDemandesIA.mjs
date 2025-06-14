// netlify/functions/updateDemandesIA.mjs

// Assurez-vous d'utiliser `fetch` ou d'installer `node-fetch` si vous êtes sur une ancienne version de Node.js
// Dans les fonctions Netlify récentes, `fetch` est généralement disponible globalement.

exports.handler = async (event) => {
    // 1. Vérifiez la méthode HTTP
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Méthode non autorisée. Seul POST est supporté." };
    }

    // 2. Parse le corps de la requête reçu de l'interface utilisateur
    let clientPayload;
    try {
        clientPayload = JSON.parse(event.body);
    } catch (error) {
        console.error("Erreur de parsing du JSON client:", error);
        return { statusCode: 400, body: JSON.stringify({ error: "Format JSON invalide dans la requête." }) };
    }

    // Log pour le débogage (optionnel, mais utile)
    console.log("Reçu de l'interface utilisateur:", clientPayload);

    // 3. Définissez l'URL de votre script Google Apps
    // **TRÈS IMPORTANT : Remplacez cette URL par l'URL DE DÉPLOIEMENT DE VOTRE SCRIPT GOOGLE APPS !**
    // C'est l'URL qui se termine par /exec
    const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec";

    try {
        // 4. Transmettez la requête au script Google Apps
        const response = await fetch(googleAppsScriptUrl, {
            method: "POST", // Le script Apps Script s'attend à un POST
            headers: {
                "Content-Type": "application/json", // Indique que le corps est du JSON
            },
            body: JSON.stringify(clientPayload), // Transmettez le payload reçu directement
        });

        // 5. Gérez la réponse du script Google Apps
        const data = await response.json(); // Le script Apps Script renvoie du JSON

        // Log la réponse de Google Apps Script (pour le débogage)
        console.log("Réponse de Google Apps Script:", data);

        // 6. Renvoie la réponse à l'interface utilisateur
        if (data.success) {
            // Si le script Apps Script a réussi, renvoie un succès HTTP 200
            return {
                statusCode: 200,
                body: JSON.stringify(data),
            };
        } else {
            // Si le script Apps Script a renvoyé une erreur (par exemple, message: "Erreur écriture fichier")
            // Renvoie une erreur HTTP 500 avec le message d'erreur du script Apps Script
            return {
                statusCode: 500, // Ou 400 si c'est une erreur côté client (ex: données manquantes)
                body: JSON.stringify(data),
            };
        }
    } catch (error) {
        // Gère les erreurs de réseau ou d'appel fetch lui-même
        console.error("Erreur lors de l'appel au script Google Apps:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erreur serveur lors de la communication avec Google Apps Script: " + error.message }),
        };
    }
};
