// .netlify/functions/proxy.js

exports.handler = async (event, context) => {
    // ... (vos en-têtes CORS et gestion OPTIONS) ...

    console.log('Méthode HTTP entrante:', event.httpMethod);
    console.log('Paramètres de requête entrants (GET):', event.queryStringParameters);
    console.log('Corps de la requête entrant (brut):', event.body); // Très important !

    let bodyParsed = {};
    if (event.body) {
        try {
            bodyParsed = JSON.parse(event.body);
            console.log('Corps de la requête entrant (parsé):', bodyParsed); // Très important !
        } catch (e) {
            console.error('Erreur lors de l\'analyse du corps JSON:', e);
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, message: "JSON invalide dans le corps de la requête." })
            };
        }
    }

    const { action, id, ...formData } = bodyParsed;
    console.log('Action extraite:', action); // Vérifiez ce que vaut 'action' ici

    // ... (le reste de votre code pour Google Sheets) ...

    if (event.httpMethod === "GET") {
        const queryParams = event.queryStringParameters || {};
        if (queryParams.action === "getDemandesIA") {
            // ... votre logique GET ...
        }
    } else if (event.httpMethod === "POST") {
        if (action === "sendDemandeIA") {
            // ... votre logique sendDemandeIA ...
        } else if (action === "deleteDemandeIA") {
            // ... votre logique deleteDemandeIA ...
        } else if (action === "markDemandeIAAsTreated") {
            // ... votre logique markDemandeIAAsTreated ...
        } else {
            // Ce bloc est exécuté si 'action' n'est pas reconnu (y compris si 'undefined')
            console.warn("Requête POST reçue avec une action non reconnue:", action);
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, message: `Action non reconnue: ${action}` })
            };
        }
    }

    // Cas de secours si aucune condition n'est remplie (ni GET, ni POST avec action reconnue)
    console.warn("Requête non gérée:", event.httpMethod, event.queryStringParameters, bodyParsed);
    return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ success: false, message: "Requête non gérée ou action manquante." })
    };
};
