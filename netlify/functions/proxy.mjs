// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export const handler = async (event) => {
    // URL de votre Google Apps Script pour les demandes IA
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

    try {
        let action = event.queryStringParameters?.action; // Tente d'abord de récupérer l'action des paramètres de requête (pour les GET)
        let requestBody = event.body; // Conserve le corps brut tel qu'il est reçu

        // Si la méthode est POST et qu'il y a un corps de requête
        if (event.httpMethod === 'POST' && requestBody) {
            try {
                // Tente de parser le corps en JSON
                const parsedBody = JSON.parse(requestBody);
                // Si le corps parsé contient une propriété 'action', l'utiliser
                if (parsedBody && parsedBody.action) {
                    action = parsedBody.action;
                }
                // Si le corps parsé contenait d'autres données utiles,
                // on les re-stringify pour les passer comme corps à la cible.
                // Cela garantit que les données comme 'id' ou 'traite' sont conservées.
                requestBody = JSON.stringify(parsedBody); 

            } catch (parseError) {
                console.warn("Proxy.mjs: Corps de requête POST non valide ou non JSON :", parseError);
                // Si le parsing échoue, requestBody reste le corps brut,
                // et action pourrait être undefined si elle n'était pas dans les query params.
                // L'erreur 400 sera renvoyée plus tard si 'action' est toujours manquante.
            }
        }
        
        let targetUrl = '';
        let fetchMethod = event.httpMethod; // Par défaut, la méthode est la même que celle de la requête entrante
        

        if (!action) {
            // Si 'action' est toujours undefined ou null après les tentatives, c'est une erreur.
            console.warn(`Proxy.mjs: Action manquante ou non reconnue: ${action || 'non spécifiée'}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: action || 'Aucune' }),
            };
        }

        switch (action) {
            case 'getProfils':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getProfils`;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'updateDemandeIA': // Cas pour marquer traité
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'POST'; // Votre GAS reçoit des POST pour les mises à jour
                // requestBody est déjà défini et devrait contenir { action: "updateDemandeIA", id: ..., traite: ... }
                break;
            
            case 'deleteDemande': // Cas pour la suppression
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'POST'; // Votre GAS reçoit des POST pour les suppressions
                // requestBody est déjà défini et devrait contenir { action: "deleteDemande", id: ... }
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                fetchMethod = 'POST';
                break;

            case 'deleteProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/deleteProfil`;
                fetchMethod = 'DELETE';
                break;

            case 'getGalleryPrompts':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`;
                fetchMethod = 'GET';
                break;

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                fetchMethod = 'POST';
                break;

            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                fetchMethod = 'GET';
                break;

            case 'chatWithGPT':
                // Cette logique de chat GPT est auto-contenue et ne forwarde pas vers targetUrl
                try {
                    const { message } = JSON.parse(event.body);

                    if (!message) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ reply: "Message vide." }),
                        };
                    }

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

            default:
                console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: action }),
                };
        }

        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

        // Si la méthode est POST/PUT/PATCH/DELETE et qu'il y a un corps (requestBody a été parsé/re-stringifié si nécessaire)
        if (requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchMethod.toUpperCase())) {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = requestBody; // Utilise le requestBody potentiellement parsé/re-stringifié
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
