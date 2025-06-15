// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
    // URL de votre Google Apps Script pour les demandes IA
    // Utilisez la variable d'environnement pour plus de sécurité et flexibilité
    // IMPORTANT : ASSUREZ-VOUS QUE CELLE DE NETLIFY EST CORRECTE ET LA PLUS RÉCENTE
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

    try {
        // Récupère l'action depuis les paramètres de requête de l'URL
        const action = event.queryStringParameters?.action;

        let targetUrl = ''; // L'URL vers laquelle la requête sera redirigée
        let fetchMethod = event.httpMethod; // La méthode HTTP originale (GET, POST, etc.)
        let requestBody = null; // Le corps de la requête que nous enverrons, initialisé à null par défaut

        // Si aucune action n'est spécifiée, renvoie une erreur 400
        if (!action) {
            console.warn(`Proxy.mjs: Action manquante.`);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: "Aucune" }),
            };
        }

        // Logique de routage basée sur l'action demandée
        switch (action) {
            case 'getProfils':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getProfils`;
                requestBody = null; // Pour un GET, il n'y a pas de corps
                break;

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'GET'; // S'assurer que la méthode est bien GET
                requestBody = null; // **CRUCIAL : Assure qu'aucun corps n'est envoyé pour cette requête GET**
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                requestBody = event.body; // Pour un POST/PUT/PATCH, on conserve le corps de la requête originale
                break;

            case 'getGalleryPrompts':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`;
                requestBody = null; // Pour un GET, il n'y a pas de corps
                break;

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                requestBody = event.body; // Pour un POST, on conserve le corps
                break;

            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                requestBody = null; // Pour un GET, il n'y a pas de corps
                break;

            default:
                // Si l'action n'est pas reconnue, renvoie une erreur 400
                console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: action }),
                };
        }

        // Options pour la requête fetch vers la cible
        const fetchOptions = {
            method: fetchMethod,
            headers: {}, // Les en-têtes seront ajoutés si nécessaire
        };

        // Ajoute le corps seulement s'il existe et si la méthode HTTP le permet (POST, PUT, PATCH)
        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(fetchMethod.toUpperCase())) {
            fetchOptions.headers["Content-Type"] = "application/json"; // Indique que le corps est du JSON
            fetchOptions.body = requestBody;
        }

        // Logs pour le débogage : très utiles pour voir ce qui est envoyé
        console.log("Proxy.mjs envoie vers :", targetUrl);
        // Masque le contenu du corps dans les logs pour éviter d'afficher des données sensibles ou volumineuses
        console.log("Options fetch :", { ...fetchOptions, body: fetchOptions.body ? '[body present]' : '[no body]' });

        // Effectue la requête HTTP vers la fonction cible ou l'API externe
        const response = await fetch(targetUrl, fetchOptions);

        // Détermine le type de contenu de la réponse et parse le corps en conséquence
        const contentType = response.headers.get("content-type") || "";
        const isJSON = contentType.includes("application/json");
        const body = isJSON ? await response.json() : await response.text();

        console.log("Proxy.mjs reçoit :", body);

        // Retourne la réponse au client (navigateur)
        return {
            statusCode: response.status, // Le statut HTTP de la réponse cible
            headers: {
                // En-têtes CORS (Cross-Origin Resource Sharing) pour autoriser les requêtes depuis votre frontend
                "Access-Control-Allow-Origin": "*", // Autorise toutes les origines (attention en production, préférez votre domaine spécifique)
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", // Autorise les méthodes HTTP nécessaires
                "Access-Control-Allow-Headers": "Content-Type, Authorization", // Autorise les en-têtes communs
                "Content-Type": isJSON ? "application/json" : "text/plain", // Définit le type de contenu de la réponse finale
            },
            // Renvoie le corps encodé en JSON si c'était du JSON à l'origine, sinon en texte brut
            body: isJSON ? JSON.stringify(body) : body,
        };

    } catch (error) {
        // Gère les erreurs qui pourraient survenir dans le proxy lui-même (ex: problème réseau, URL malformée)
        console.error("Erreur dans proxy.mjs :", error);
        return {
            statusCode: 500, // Statut d'erreur interne du serveur
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
        };
    }
};
