// netlify/functions/updateDemandesIA.mjs

exports.handler = async (event) => {
    // URL de votre script Google Apps. C'est l'URL qui se termine par /exec.
    // REMPLACEZ CETTE URL par la vôtre, si ce n'est pas déjà fait !
    const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbxZuIatCEVwllJkrn5AQqPlczpJcb2WIlB9WzzhYXkSoMZuQ858bb6--cm759Rs58d9/exec";

    console.log(`Requête reçue par Netlify: Méthode ${event.httpMethod}, Chemin ${event.path}`);

    // --- GESTION DES REQUÊTES GET ---
    if (event.httpMethod === "GET") {
        console.log(`Proxy.mjs envoie GET vers : ${googleAppsScriptUrl}?action=getDemandesIA`);
        console.log("Options fetch GET : { method: 'GET', headers: {} }");

        try {
            const response = await fetch(`${googleAppsScriptUrl}?action=getDemandesIA`, {
                method: "GET",
                headers: {}, // Pas besoin de Content-Type pour un GET simple
            });

            // Gérer les réponses non OK (e.g., 404, 500 de Google Apps Script)
            if (!response.ok) {
                const errorText = await response.text(); // Lire le corps comme texte pour voir l'erreur HTML/autre
                console.error(`Erreur HTTP de Google Apps Script (GET): ${response.status} - ${response.statusText}. Réponse: ${errorText}`);
                return {
                    statusCode: response.status,
                    body: JSON.stringify({
                        error: `Erreur du service Google Apps Script (GET): ${response.status} ${response.statusText}`,
                        details: errorText
                    }),
                };
            }

            const data = await response.json(); // Tenter de parser comme JSON
            console.log("Proxy.mjs reçoit (GET) :", data);
            return {
                statusCode: 200,
                body: JSON.stringify(data),
            };

        } catch (error) {
            console.error("Erreur lors de l'appel GET au script Google Apps (depuis Netlify):", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Erreur serveur lors de la communication GET avec Google Apps Script: " + error.message }),
            };
        }
    }

    // --- GESTION DES REQUÊTES POST ---
    else if (event.httpMethod === "POST") {
        let clientPayload;
        try {
            clientPayload = JSON.parse(event.body); // Parse le corps JSON envoyé par le frontend
        } catch (error) {
            console.error("Erreur de parsing du JSON client (POST):", error);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Format JSON invalide dans la requête POST." }),
            };
        }

        console.log("Reçu de l'interface utilisateur (depuis Netlify - POST):", clientPayload);
        console.log(`Proxy.mjs envoie POST vers : ${googleAppsScriptUrl}`);
        console.log("Options fetch POST :", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientPayload)
        });

        try {
            // C'EST CET APPEL QUI DOIT ALLER VERS VOTRE GOOGLE APPS SCRIPT
            const response = await fetch(googleAppsScriptUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Indique que le corps est du JSON
                },
                body: JSON.stringify(clientPayload), // Transmettez le payload reçu directement
            });

            // Gérer les réponses non OK
            if (!response.ok) {
                const errorText = await response.text(); // Lire le corps comme texte pour voir l'erreur HTML/autre
                console.error(`Erreur HTTP de Google Apps Script (POST): ${response.status} - ${response.statusText}. Réponse: ${errorText}`);
                return {
                    statusCode: response.status,
                    body: JSON.stringify({
                        error: `Erreur du service Google Apps Script (POST): ${response.status} ${response.statusText}`,
                        details: errorText
                    }),
                };
            }

            const data = await response.json(); // Tenter de parser la réponse comme JSON
            console.log("Réponse de Google Apps Script (reçue par Netlify - POST):", data);

            // Renvoie la réponse à l'interface utilisateur
            if (data.success) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(data),
                };
            } else {
                // Si le script Apps Script a renvoyé une erreur JSON (e.g., success: false)
                return {
                    statusCode: 500, // Ou le code d'erreur approprié de 'data' si disponible
                    body: JSON.stringify(data),
                };
            }

        } catch (error) {
            // Gère les erreurs de réseau ou d'appel fetch lui-même (comme "Unexpected token <" si la réponse n'est pas JSON)
            console.error("Erreur lors de l'appel POST au script Google Apps (depuis Netlify):", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Erreur serveur lors de la communication POST avec Google Apps Script: " + error.message }),
            };
        }
    }

    // --- GESTION DES MÉTHODES NON AUTORISÉES ---
    else {
        return { statusCode: 405, body: "Méthode non autorisée. Seuls GET et POST sont supportés." };
    }
};
