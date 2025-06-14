// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    const action = event.queryStringParameters?.action; // Récupère l'action depuis les paramètres de requête

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body;
    let isLocalFunctionCall = false;

    // Logique de routage basée sur l'action
    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getProfils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil';
        isLocalFunctionCall = true;
        break;

      case 'getGalleryPrompts':
        targetUrl = '/.netlify/functions/getGalleryPrompts';
        isLocalFunctionCall = true;
        break;

      case 'saveTip':
        targetUrl = '/.netlify/functions/saveTip';
        isLocalFunctionCall = true;
        break;

      // --- NOUVEAU CASE POUR LA MISE À JOUR DES DEMANDES IA ---
      case 'updateDemandeIA':
        targetUrl = '/.netlify/functions/updateDemandesIA'; // Redirige vers une nouvelle fonction locale
        isLocalFunctionCall = true;
        // Le body et la méthode (POST) seront automatiquement transmis
        break;
      // -----------------------------------------------------

      default:
        console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Action non reconnue." }),
        };
    }

    // Construit l'URL complète pour les fonctions locales
    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {
        // Important: pour les fonctions locales, le Content-Type doit être préservé.
        // Le proxy le transmettra si `fetchBody` est présent.
      },
    };

    if (fetchBody && fetchMethod === "POST") {
      // Assurez-vous que le Content-Type est correctement défini pour la fonction cible
      // Si le body est déjà une chaîne JSON, pas besoin de JSON.stringify ici.
      fetchOptions.headers["Content-Type"] = "application/json"; 
      fetchOptions.body = fetchBody;
    }

    console.log("Proxy.mjs envoie vers :", fullTargetUrl);
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(fullTargetUrl, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");
    const body = isJSON ? await response.json() : await response.text();

    console.log("Proxy.mjs reçoit :", body);

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
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
