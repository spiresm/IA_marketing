const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

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
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil';
        isLocalFunctionCall = true;
        break;

      case 'deleteDemande':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;

      case 'updateDemandeIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;

      case 'sendRequest':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;

      default:
        console.warn(`Proxy.cjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Action non reconnue ou manquante." }),
        };
    }

    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {},
    };

    if (fetchMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = fetchBody;
    }

    console.log("Proxy.cjs envoie vers :", fullTargetUrl);
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(fullTargetUrl, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");
    const body = isJSON ? await response.json() : await response.text();

    console.log("Proxy.cjs reçoit :", body);

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
    console.error("Erreur dans proxy.cjs :", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
    };
  }
};
