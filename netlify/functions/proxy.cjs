// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Ajoute ici l'importation pour l'API OpenAI si tu l'utilises
// Par exemple: import OpenAI from 'openai';
// Ou si tu utilises directement l'API de Google Gemini ou autre, importe le client nécessaire
// Exemple pour OpenAI:
import OpenAI from 'openai';

// Initialise l'API Key pour OpenAI
// Assure-toi que OPENAI_API_KEY est défini dans les variables d'environnement de Netlify
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


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
                requestBody = null;
                break;

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                requestBody = event.body;
                break;

            case 'deleteProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/deleteProfil`;
                fetchMethod = 'DELETE';
                requestBody = event.body;
                break;

            case 'getGalleryPrompts':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`;
                requestBody = null;
                break;

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                requestBody = event.body;
                break;

            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                requestBody = null;
                break;

            case 'chatWithGPT': // <--- NOUVEAU CASE POUR LE CHATBOT
                try {
                    // Le message de l'utilisateur est dans le corps de la requête POST
                    const { message } = JSON.parse(event.body);

                    if (!message) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ reply: "Message vide." }),
                        };
                    }

                    // *** REMPLACEZ CE BLOC PAR L'APPEL À VOTRE API GPT ***
                    // Exemple avec OpenAI:
                    const completion = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo", // Ou le modèle que tu utilises (e.g., "gpt-4", "gemini-pro")
                        messages: [{ role: "user", content: message }],
                        max_tokens: 300, // Limite la longueur de la réponse
                        temperature: 0.7, // Contrôle la créativité (0.0 très factuel, 1.0 très créatif)
                    });

                    const reply = completion.choices[0].message.content;

                    // Si tu n'as pas encore connecté l'API, tu peux utiliser une réponse de test temporaire :
                    // const reply = `J'ai bien reçu votre message : "${message}". (Réponse de test)`

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
            // FIN DU NOUVEAU CASE POUR LE CHATBOT

            default:
                // Si l'action n'est pas reconnue, renvoie une erreur 400
                console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: action }),
                };
        }

        // Si l'action a été gérée par un case spécifique (comme chatWithGPT qui retourne déjà une réponse),
        // alors la suite du code n'est pas exécutée pour ces cas.
        // Seules les actions qui définissent targetUrl et requestBody continueront ici.

        // Options pour la requête fetch vers la cible
        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

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
