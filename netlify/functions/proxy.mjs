// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// IMPORTANT : Commentez ou supprimez les lignes OpenAI si OPENAI_API_KEY n'est pas définie dans Netlify
// ou si vous ne souhaitez pas utiliser cette fonctionnalité pour le moment,
// pour éviter les erreurs 502.
// import OpenAI from 'openai';
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Importez getProfilsHandler, getGalleryPromptsHandler, getSharedTipsHandler etc. si ce sont des fonctions séparées
// Assurez-vous que les chemins sont corrects par rapport à ce fichier proxy.mjs
// Par exemple:
import { handler as getProfilsHandler } from './getProfils.mjs'; // Adaptez le nom du fichier si différent
import { handler as getGalleryPromptsHandler } from './getGalleryPrompts.mjs'; // Adaptez le nom du fichier si différent
import { handler as getTipsHandler } from './get-tips.mjs'; // C'est votre fonction get-tips.mjs pour 'getTips'


export const handler = async (event) => {
    // URL de votre Google Apps Script pour les demandes IA
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

    try {
        let action = event.queryStringParameters?.action; // Tente d'abord de récupérer l'action des paramètres de requête (pour les GET)
        let dataFromClient = null; // Cette variable contiendra l'objet JSON parsé du corps si applicable

        // Si la méthode est POST et qu'il y a un corps de requête
        if (event.httpMethod === 'POST' && event.body) {
            try {
                dataFromClient = JSON.parse(event.body);
                // Si le corps parsé contient une propriété 'action', l'utiliser
                if (dataFromClient && dataFromClient.action) {
                    action = dataFromClient.action;
                }
            } catch (parseError) {
                console.warn("Proxy.mjs: Corps de requête POST non JSON valide ou sans action détectée :", parseError);
                // Si le parsing échoue, dataFromClient reste null, et action reste du query param ou undefined.
                // L'erreur 400 sera renvoyée si 'action' est toujours manquante.
            }
        }

        let targetUrl = '';
        let fetchMethod = event.httpMethod;
        let requestBodyForTarget = null; // Cette variable sera le corps final envoyé à la cible (GAS ou autre)

        const effectiveAction = action || '';

        if (!effectiveAction) {
            console.warn(`Proxy.mjs: Action manquante ou non reconnue: ${effectiveAction || 'non spécifiée'}. Méthode: ${event.httpMethod}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: effectiveAction || 'Aucune' }),
            };
        }

        switch (effectiveAction) {
            case 'getProfils':
                // targetUrl = `https://${event.headers.host}/.netlify/functions/getProfils`; // Ancien si appelait directement
                // Utilisation de la fonction importée
                console.log("Proxy: Délégation de l'action 'getProfils' à getProfils.mjs");
                return await getProfilsHandler(event); // Passe l'événement directement à la fonction cible

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction;
                fetchMethod = 'GET';
                requestBodyForTarget = null;
                break;

            case 'updateDemandeIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction;
                fetchMethod = 'POST';
                if (dataFromClient && dataFromClient.id) {
                    requestBodyForTarget = JSON.stringify({
                        action: effectiveAction,
                        demandes: [{
                            id: dataFromClient.id,
                            traite: dataFromClient.traite
                        }]
                    });
                } else {
                    console.error("Proxy.mjs: ID ou statut 'traite' manquant pour updateDemandeIA. Données reçues:", dataFromClient);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ success: false, message: "ID de la demande ou statut 'traite' manquant pour la mise à jour." }),
                    };
                }
                break;

            case 'deleteDemande':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + effectiveAction;
                fetchMethod = 'POST';
                if (dataFromClient && dataFromClient.id) {
                    requestBodyForTarget = JSON.stringify({
                        action: effectiveAction,
                        id: dataFromClient.id
                    });
                } else {
                    console.error("Proxy.mjs: ID manquant pour deleteDemande. Données reçues:", dataFromClient);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ success: false, message: "ID de la demande manquant pour la suppression." }),
                    };
                }
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                fetchMethod = 'POST';
                requestBodyForTarget = JSON.stringify(dataFromClient);
                break;

            case 'deleteProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/deleteProfil`;
                fetchMethod = 'DELETE';
                requestBodyForTarget = JSON.stringify(dataFromClient);
                break;

            case 'getGalleryPrompts':
                // targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`; // Ancien si appelait directement
                // Utilisation de la fonction importée
                console.log("Proxy: Délégation de l'action 'getGalleryPrompts' à getGalleryPrompts.mjs");
                return await getGalleryPromptsHandler(event); // Passe l'événement directement à la fonction cible

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                fetchMethod = 'POST';
                requestBodyForTarget = JSON.stringify(dataFromClient);
                break;

            // NOUVEAU CASE POUR 'getTips' qui délègue à get-tips.mjs
            case 'getTips':
                console.log("Proxy: Délégation de l'action 'getTips' à get-tips.mjs");
                return await getTipsHandler(event); // Appelle la fonction get-tips.mjs


            // Ancienne action getSharedTips (si elle existait en tant que endpoint séparé)
            // Si getSharedTips.mjs est la même fonction que get-tips.mjs, ce case n'est plus nécessaire.
            // Si c'est une fonction différente, gardez-la et importez-la distinctement.
            /*
            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                fetchMethod = 'GET';
                requestBodyForTarget = null;
                break;
            */

            case 'chatWithGPT':
                /*
                // ... votre code chatWithGPT ...
                */
               break;

            default:
                console.warn(`Proxy.mjs: Action non reconnue: ${effectiveAction}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: "Action non reconnue ou manquante.", actionReçue: effectiveAction }),
                };
        }

        // Si le switch a délégué le traitement (return await handler(...)), le code ci-dessous n'est pas exécuté.
        // Il est exécuté uniquement si 'targetUrl' est défini dans le switch.

        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

        if (requestBodyForTarget && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchMethod.toUpperCase())) {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = requestBodyForTarget;
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
