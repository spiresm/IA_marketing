// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
    // URL de votre Google Apps Script pour les demandes IA
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

    try {
        // Récupère l'action depuis les paramètres de requête de l'URL
        const action = event.queryStringParameters?.action;

        let targetUrl = ''; // L'URL vers laquelle la requête sera redirigée
        let fetchMethod = event.httpMethod; // La méthode HTTP originale (GET, POST, etc.)
        let fetchBody = event.body; // Le corps de la requête originale
        let isLocalFunctionCall = false; // Indicateur si la cible est une autre fonction Netlify locale

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
                // Redirige vers la fonction Netlify locale en charge de la récupération des profils
                targetUrl = '/.netlify/functions/getProfils';
                isLocalFunctionCall = true;
                break;

            case 'getDemandesIA':
                // Redirige vers l'API externe (Google Apps Script) pour les demandes IA
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                break;

            case 'updateProfil':
                // Redirige vers la fonction Netlify locale en charge de la mise à jour de profil
                targetUrl = '/.netlify/functions/updateProfil';
                isLocalFunctionCall = true;
                break;

            case 'getGalleryPrompts':
                // *** NOUVEAU/CORRIGÉ : Redirige vers la fonction Netlify locale pour les prompts de galerie ***
                targetUrl = '/.netlify/functions/getGalleryPrompts';
                isLocalFunctionCall = true;
                break;

            case 'saveTip':
                // Redirige vers la fonction Netlify locale pour sauvegarder un tip
                targetUrl = '/.netlify/functions/saveTip';
                isLocalFunctionCall = true;
                // Pour les appels POST vers des fonctions locales, le body original est conservé.
                break;

            case 'getSharedTips':
                // *** NOUVEAU : Redirige vers la fonction Netlify locale pour récupérer les tips partagés ***
                targetUrl = '/.netlify/functions/getSharedTips';
                isLocalFunctionCall = true;
                break;

            default:
                // Si l'action n'est pas reconnue, renvoie une erreur 400
                console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: action }),
                };
        }

        // Construit l'URL complète pour les fonctions Netlify locales
        // event.headers.host permet de construire une URL absolue pour les appels inter-fonctions Netlify
        const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

        // Options pour la requête fetch vers la cible
        const fetchOptions = {
            method: fetchMethod,
            headers: {}, // Les en-têtes seront ajoutés si nécessaire
        };

        // Si c'est une requête POST et qu'il y a un corps, ajoute le Content-Type et le corps
        if (fetchBody && fetchMethod === "POST") {
            fetchOptions.headers["Content-Type"] = "application/json"; // Indique que le corps est du JSON
            fetchOptions.body = fetchBody;
        }

        console.log("Proxy.mjs envoie vers :", fullTargetUrl);
        console.log("Options fetch :", fetchOptions);

        // Effectue la requête HTTP vers la fonction cible ou l'API externe
        const response = await fetch(fullTargetUrl, fetchOptions);

        // Détermine le type de contenu de la réponse et parse le corps en conséquence
        const contentType = response.headers.get("content-type") || "";
        const isJSON = contentType.includes("application/json");
        const body = isJSON ? await response.json() : await response.text();

        console.log("Proxy.mjs reçoit :", body);

        // Retourne la réponse au client (navigateur)
        return {
            statusCode: response.status, // Le statut HTTP de la réponse cible
            headers: {
                // En-têtes CORS pour autoriser les requêtes depuis votre frontend
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                // Définit le type de contenu de la réponse finale
                "Content-Type": isJSON ? "application/json" : "text/plain",
            },
            // Renvoie le corps encodé en JSON si c'était du JSON à l'origine
            body: isJSON ? JSON.stringify(body) : body,
        };

    } catch (error) {
        // Gère les erreurs qui pourraient survenir dans le proxy lui-même
        console.error("Erreur dans proxy.mjs :", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
        };
    }
};
