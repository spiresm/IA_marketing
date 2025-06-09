// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  // URL des Google Apps Scripts distantes (pour les demandes d'IA, etc.)
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    const action = event.queryStringParameters?.action;

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body;
    let isLocalFunctionCall = false; // Indicateur pour appeler une fonction Netlify locale

    switch (action) {
      case 'getProfils':
        // Pour les profils, on appelle une AUTRE fonction Netlify locale
        targetUrl = '/.netlify/functions/getprofils'; // Le chemin vers votre fonction getprofils
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        // Pour les demandes d'IA, on appelle toujours l'Apps Script distante
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        break;

      default:
        console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Action non reconnue." }),
        };
    }

    // Si c'est un appel à une fonction locale Netlify, on utilise le chemin relatif
    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: { "Content-Type": "application/json" },
      body: fetchBody,
    };

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
