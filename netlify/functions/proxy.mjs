// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// IMPORTANT : Commentez ou supprimez les lignes OpenAI si OPENAI_API_KEY n'est pas définie dans Netlify
// ou si vous ne souhaitez pas utiliser cette fonctionnalité pour le moment,
// pour éviter les erreurs 502.
// import OpenAI from 'openai'; 
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 


export const handler = async (event) => {
    // URL de votre Google Apps Script pour les demandes IA
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

    try {
        let action = event.queryStringParameters?.action; // Tente d'abord de récupérer l'action des paramètres de requête (pour les GET)
        let requestBody = event.body; // Conserve le corps brut tel qu'il est reçu initialement
        let parsedBody = null; // Pour stocker le corps JSON parsé si applicable

        // Si la méthode est POST et qu'il y a un corps de requête
        if (event.httpMethod === 'POST' && requestBody) {
            try {
                parsedBody = JSON.parse(requestBody);
                if (parsedBody && parsedBody.action) {
                    action = parsedBody.action; // L'action est dans le corps JSON
                }
                // Si le parsing réussit, on met à jour requestBody pour qu'il soit le JSON stringifié valide
                requestBody = JSON.stringify(parsedBody); 
            } catch (parseError) {
                console.warn("Proxy.mjs: Corps de requête POST non JSON valide ou sans action détectée :", parseError);
            }
        }
        
        let targetUrl = '';
        let fetchMethod = event.httpMethod; 
        
        // --- CORRECTION ICI : S'assurer que 'action' est une chaîne vide si non définie ---
        // Avant d'atteindre le switch, s'assurer que 'action' est une chaîne de caractères
        // Cela évite 'ReferenceError: action is not defined' si 'action' est undefined
        const effectiveAction = action || ''; 
        // --- FIN DE LA CORRECTION ---


        if (!effectiveAction) { // Utiliser effectiveAction ici
            console.warn(`Proxy.mjs: Action manquante ou non reconnue: ${effectiveAction || 'non spécifiée'}. Méthode: ${event.httpMethod}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: effectiveAction || 'Aucune' }),
            };
        }

        // Utiliser 'effectiveAction' dans le switch
        switch (effectiveAction) { // Ligne 37 du log (environ)
            case 'getProfils':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getProfils`;
                fetchMethod = 'GET';
                requestBody = null; // Pas de corps pour un GET
                break;

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction; // Utiliser effectiveAction
                fetchMethod = 'GET';
                requestBody = null; // Pas de corps pour un GET
                break;

            case 'updateDemandeIA': // Corrigé : Formatage du corps pour GAS
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction; // Utiliser effectiveAction
                fetchMethod = 'POST'; // Votre GAS attend un POST
                if (parsedBody && parsedBody.id) {
                    // Reconstruire le corps JSON avec le format 'demandes: [...]' attendu par GAS
                    requestBody = JSON.stringify({
                        action: effectiveAction, // Utiliser effectiveAction
                        demandes: [{ 
                            id: parsedBody.id,
                            traite: parsedBody.traite // Doit être true
                        }]
                    });
                } else {
                    console.error("Proxy.mjs: ID ou statut 'traite' manquant pour updateDemandeIA.");
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ success: false, message: "ID ou statut de demande manquant pour la mise à jour." }),
                    };
                }
                break;
            
            case 'deleteDemande': // Corrigé : Formatage du corps pour GAS (si nécessaire)
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction; // Utiliser effectiveAction
                fetchMethod = 'POST'; // Votre GAS attend un POST
                if (parsedBody && parsedBody.id) {
                     // Envoyer l'ID dans un tableau 'demandes' pour cohérence avec updateDemandeIA,
                     // si votre GAS attend ce format pour la suppression aussi.
                     requestBody = JSON.stringify({
                        action: effectiveAction, // Utiliser effectiveAction
                        demandes: [{ id: parsedBody.id }] 
                    });
                } else {
                    console.error("Proxy.mjs: ID manquant pour deleteDemande.");
                     return {
                        statusCode: 400,
                        body: JSON.stringify({ success: false, message: "ID de demande manquant pour la suppression." }),
                    };
                }
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                fetchMethod = 'POST';
                // requestBody est déjà le JSON stringifié du body original
                break;

            case 'deleteProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/deleteProfil`;
                fetchMethod = 'DELETE'; // Ou POST selon ce que deleteProfil attend
                // requestBody est déjà le JSON stringifié du body original
                break;

            case 'getGalleryPrompts':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                fetchMethod = 'POST';
                // requestBody est déjà le JSON stringifié du body original
                break;

            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'chatWithGPT':
                // REMARQUE : Ce bloc ne s'exécute que si 'action' est 'chatWithGPT'.
                // L'initialisation 'new OpenAI' en dehors du handler pourrait toujours causer un 502
                // si OPENAI_API_KEY est manquante ou invalide. Décommentez les imports OpenAI en haut
                // et configurez la clé quand vous êtes prêt à l'utiliser.
                // Sinon, le proxy ne tentera pas d'appeler OpenAI tant que cette action n'est pas demandée.
                /*
                try {
                    const { message } = JSON.parse(event.body); // Le corps pour chatWithGPT est parsé ici

                    if (!message) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ reply: "Message vide." }),
                        };
                    }

                    // Assurez-vous que 'openai' est défini (non commenté en haut)
                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: [{ role: "user", content: message }],
                        max_tokens: 300,
                        temperature: 0.7,
                    });

                    const reply = completion.choices[0].message.content;

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ reply: reply }),
                    };
                } catch (chatError) {
                    console.error("Erreur lors de l'appel à l'API GPT :", chatError);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ reply: `Désolé, une erreur est survenue lors de la communication avec l'IA: ${chatError.message}` }),
                    };
                }
                */
               break; 

            default:
                console.warn(`Proxy.mjs: Action non reconnue: ${effectiveAction}`); // Utiliser effectiveAction
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: effectiveAction }),
                };
        }

        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

        // Si la méthode est POST/PUT/PATCH/DELETE et qu'il y a un corps (requestBody a été parsé/re-stringifié si nécessaire)
        if (requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchMethod.toUpperCase())) {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = requestBody; 
        }

        console.log("Proxy.mjs envoie vers :", targetUrl);
        console.log("Options fetch :", { ...fetchOptions, body: fetchOptions.body ? '[body present]' : '[no body]' });

        const response = await fetch(targetUrl, fetchOptions);

        const contentType = response.headers.get("content-type") || "";
        const isJSON = contentType.includes("application/json");
        const body = isJSON ? await response.json() : await response.text();

        console.log("Proxy.mjs reçoit :", body);

        return {
            statusCode: response.status,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": isJSON ? "application/json" : "text/plain",
            },
            body: isJSON ? JSON.stringify(body) : body,
        };

    } catch (error) {
        console.error("Erreur dans proxy.mjs :", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
        };
    }
};
