// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch pour compatibilité ESM (ES Modules)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export const handler = async (event) => {
    // URL du Google Apps Script pour les demandes.
    // Il est fortement recommandé d'utiliser process.env. pour la sécurité et la flexibilité.
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbxZuIatCEVwllJkrn5AQqPlczpJcb2WIlB9WzzhYXkSoMZuQ858bb6--cm759Rs58d9/exec';

    // Les chemins des fonctions Netlify locales
    const LOCAL_FUNCTIONS = {
        getProfils: '/.netlify/functions/getProfils',
        updateProfil: '/.netlify/functions/updateProfil',
        getGalleryPrompts: '/.netlify/functions/getGalleryPrompts',
        saveTip: '/.netlify/functions/saveTip',
        updateDemandeIA: '/.netlify/functions/updateDemandesIA', // Correction du nom de la fonction si elle s'appelle "updateDemandesIA"
    };

    try {
        let action = event.queryStringParameters?.action; // Tente de récupérer l'action des paramètres de requête (pour GET)
        const fetchMethod = event.httpMethod; // Méthode HTTP de la requête entrante
        let fetchBody = event.body; // Corps de la requête entrante

        // Si c'est une requête POST et que l'action n'a pas été trouvée dans les paramètres de requête,
        // tente de la récupérer depuis le corps de la requête JSON.
        if (fetchMethod === 'POST' && !action && fetchBody) {
            try {
                const bodyParsed = JSON.parse(fetchBody);
                action = bodyParsed.action; // Récupère l'action du corps JSON
                // Si l'action est présente dans le corps, et d'autres données sont requises par la fonction cible,
                // il peut être utile de passer le corps parsé ou de l'ajuster.
                // Pour updateDemandeIA, le corps sera le tableau 'demandes'.
                // On peut le ré-stringify plus tard si nécessaire pour le fetch.
            } catch (parseError) {
                console.error("Proxy.mjs: Erreur lors de l'analyse du corps JSON pour récupérer l'action:", parseError);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Corps de requête JSON invalide." }),
                };
            }
        }

        let targetUrl;
        let isLocalFunctionCall = false;

        // Logique de routage basée sur l'action
        switch (action) {
            case 'getProfils':
            case 'updateProfil':
            case 'getGalleryPrompts':
            case 'saveTip':
            case 'updateDemandeIA':
                isLocalFunctionCall = true;
                targetUrl = LOCAL_FUNCTIONS[action];
                break;

            case 'getDemandesIA':
                targetUrl = `${DEMANDS_SCRIPT_URL}?action=${action}`; // L'action est ajoutée aux query params pour le Apps Script
                break;

            default:
                // Si aucune action valide n'est spécifiée, renvoyer une erreur 400.
                console.warn(`Proxy.mjs: Action non reconnue ou manquante: ${action || 'aucune action spécifiée'}.`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Action non reconnue ou manquante: ${action || 'aucune action spécifiée'}.` }),
                };
        }

        // Construit l'URL complète pour les fonctions locales ou utilise l'URL externe directement
        const fullTargetUrl = isLocalFunctionCall
            ? new URL(targetUrl, `https://${event.headers.host}`).toString()
            : targetUrl;

        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

        // Gérer le corps de la requête uniquement pour les méthodes qui le nécessitent
        if (fetchBody && (fetchMethod === "POST" || fetchMethod === "PUT" || fetchMethod === "PATCH")) {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = fetchBody; // Le corps est déjà une chaîne JSON si parsé puis stringifié, ou directement la chaîne d'origine.
        }

        console.log("--- Début de l'appel Proxy.mjs ---");
        console.log(`Action reçue: "${action}"`);
        console.log(`Méthode HTTP: "${fetchMethod}"`);
        console.log("Redirection vers :", fullTargetUrl);
        console.log("Options fetch utilisées :", JSON.stringify(fetchOptions, null, 2)); // Log des options pour le débogage

        const response = await fetch(fullTargetUrl, fetchOptions);

        const contentType = response.headers.get("content-type") || "";
        const isJSON = contentType.includes("application/json");
        let responseBody;

        try {
            responseBody = isJSON ? await response.json() : await response.text();
        } catch (parseResBodyError) {
            console.error("Proxy.mjs: Erreur lors de l'analyse du corps de la réponse de la cible:", parseResBodyError);
            // On peut choisir de renvoyer l'erreur ou le texte brut si le JSON est corrompu
            responseBody = await response.text(); // Tentative de récupération en texte brut
            isJSON = false; // Le contenu n'est pas un JSON valide après tout
        }

        console.log(`Réponse de la cible (statut ${response.status}):`, isJSON ? JSON.stringify(responseBody, null, 2) : responseBody);
        console.log("--- Fin de l'appel Proxy.mjs ---");

        return {
            statusCode: response.status,
            headers: {
                "Access-Control-Allow-Origin": "*", // À adapter en production si vous avez un domaine spécifique
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Ajout de PUT/DELETE pour plus de flexibilité
                "Access-Control-Allow-Headers": "Content-Type, Authorization", // Ajout d'Authorization pour potentiels jetons
                "Content-Type": isJSON ? "application/json" : "text/plain",
            },
            body: isJSON ? JSON.stringify(responseBody) : responseBody,
        };

    } catch (error) {
        console.error("Proxy.mjs: Erreur interne non gérée :", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
        };
    }
};
