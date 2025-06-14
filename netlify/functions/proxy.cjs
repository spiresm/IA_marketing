const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL ||
    'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

  try {
    let action = event.queryStringParameters?.action;
    let requestBody = {};

    if (event.httpMethod === "POST" && event.body) {
      try {
        requestBody = JSON.parse(event.body);
        if (requestBody.action) {
          action = requestBody.action;
        }
      } catch (parseError) {
        console.error("Erreur de parsing JSON du corps de la requête POST :", parseError);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Corps de la requête JSON invalide." }),
        };
      }
    }

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body;
    let isLocalFunctionCall = false;

    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getProfils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
      case 'deleteDemande':
      case 'updateDemandeIA':
      case 'sendRequest':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        if (event.httpMethod === "POST") {
          fetchBody = JSON.stringify(requestBody);
        }
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil';
        isLocalFunctionCall = true;
        break;

      default:
        console.warn(`Proxy.cjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Action non reconnue ou manquante.", actionReçue: action }),
        };
    }

    const fullTargetUrl = isLocalFunctionCall
      ? new URL(targetUrl, `https://${event.headers.host}`).toString()
      : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {},
    };

    if (fetchMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = fetchBody;
    }

    // Facultatif : Indique qu'on attend du JSON
    fetchOptions.headers["Accept"] = "application/json";

    console.log("Proxy.cjs envoie vers :", fullTargetUrl);
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(fullTargetUrl, fetchOptions);
    const rawText = await response.text();

    let body;
    try {
      body = JSON.parse(rawText);
    } catch (err) {
      console.warn("Réponse non-JSON, renvoi du texte brut.");
      body = rawText;
    }

    console.log("Proxy.cjs reçoit :", body);

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": typeof body === "object" ? "application/json" : "text/plain",
      },
      body: typeof body === "object" ? JSON.stringify(body) : body,
    };

  } catch (error) {
    console.error("Erreur dans proxy.cjs :", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
    };
  }
};
