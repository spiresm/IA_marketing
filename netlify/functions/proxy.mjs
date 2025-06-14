// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    let action = event.queryStringParameters?.action; // Tente de récupérer l'action des paramètres de requête (pour GET)

    let fetchMethod = event.httpMethod;
    let fetchBody = event.body;
    let isLocalFunctionCall = false;

    // Si c'est une requête POST et que l'action n'a pas été trouvée dans les paramètres de requête,
    // tente de la récupérer depuis le corps de la requête.
    if (fetchMethod === 'POST' && !action && fetchBody) {
        try {
            const bodyParsed = JSON.parse(fetchBody);
            action = bodyParsed.action; // Récupère l'action du corps JSON
        } catch (parseError) {
            console.error("Erreur lors de l'analyse du corps JSON pour récupérer l'action:", parseError);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid JSON body." }),
            };
        }
    }

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

      case 'updateDemandeIA': // Ce cas est maintenant accessible pour les requêtes POST
        targetUrl = '/.netlify/functions/updateDemandesIA';
        isLocalFunctionCall = true;
        break;

      default:
        console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Action non reconnue: ${action || 'aucune action spécifiée'}.` }),
        };
    }

    // Construit l'URL complète pour les fonctions locales
    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {}, // Headers initialized empty
    };

    if (fetchBody && fetchMethod === "POST") {
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
