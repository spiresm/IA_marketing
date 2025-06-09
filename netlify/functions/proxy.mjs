// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    const action = event.queryStringParameters?.action;

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body; // Le corps original de la requête entrante
    let isLocalFunctionCall = false;

    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getprofils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        break;

      default:
        console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Action non reconnue." }),
        };
    }

    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {}, // Initialise les headers à vide
    };

    // NOUVELLE LOGIQUE : N'ajoute le Content-Type et le body QUE pour les méthodes POST
    if (fetchMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = fetchBody;
    }
    // Note: Pour les requêtes GET/HEAD, fetchOptions.body ne sera pas défini, ce qui est correct.

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
