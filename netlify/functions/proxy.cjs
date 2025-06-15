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
    let fetchBody = event.body; // Initialisé avec le corps brut de l'événement POST

    let isLocalFunctionCall = false;

    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getProfils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
      case 'updateDemandeIA':
      case 'sendRequest':
        // Pour ces actions, l'URL de base du script GAS est suffisante avec l'action en paramètre
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        // Le fetchBody est déjà défini par event.body si c'est un POST,
        // ce qui est correct si le corps entier doit être transmis à GAS.
        break;

      case 'deleteDemande': // <-- J'AI RENOMMÉ CECI POUR CORRESPONDRE AU CLIENT
        // Pour la suppression, nous voulons envoyer l'ID spécifique.
        // Il est plus propre d'envoyer l'ID via un paramètre d'URL pour la suppression simple.
        // Assurez-vous que requestBody.id contient l'ID envoyé par le client.
        if (!requestBody.id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "ID de la demande manquant pour la suppression." }),
          };
        }
        // Construire l'URL avec l'action et l'ID
        targetUrl = `${DEMANDS_SCRIPT_URL}?action=${action}&id=${requestBody.id}`;
        // Pour une suppression par ID via paramètre d'URL, le body n'est pas strictement nécessaire pour GAS
        fetchBody = null; // Ne pas envoyer de corps si l'ID est dans l'URL
        fetchMethod = "GET"; // La plupart des APIs GAS attendent un GET pour la suppression via paramètre,
                              // mais POST est aussi possible si votre GAS est configuré pour doPost.
                              // Si votre GAS utilise doPost pour la suppression par ID, laissez 'POST'.
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

    if (fetchMethod === "POST" && fetchBody) { // Vérifier fetchBody avant de l'ajouter
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
