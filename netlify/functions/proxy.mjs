// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  // URLs des Google Apps Scripts distantes (pour les demandes d'IA, etc.)
  // On conserve la variable d'environnement pour la flexibilité.
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    const action = event.queryStringParameters?.action;

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body;
    let isLocalFunctionCall = false; // Indicateur pour appeler une fonction Netlify locale

    // Détermine l'action et la cible
    switch (action) {
      case 'getProfils':
        // Pour les profils, on va appeler une AUTRE fonction Netlify locale
        targetUrl = '/.netlify/functions/getprofils'; // Le chemin vers votre fonction getprofils
        isLocalFunctionCall = true;
        break;

      case 'updateProfil':
      case 'deleteProfil':
        // Si vous avez des Google Apps Script pour ces actions sur les profils,
        // vous DEVEZ fournir l'URL de votre Apps Script de profils ici.
        // Sinon, vous devrez implémenter la modification/suppression via GitHub API dans getprofils.
        // Pour l'instant, je vais laisser un message d'erreur si ces actions sont appelées sans source.
        console.warn(`Proxy.mjs: Action '${action}' pour les profils non implémentée via Apps Script ni GitHub pour le moment.`);
        return {
          statusCode: 501, // Not Implemented
          body: JSON.stringify({ message: `Action '${action}' non implémentée pour les profils.` }),
        };
        // Exemple si vous remettez une Apps Script pour update/delete:
        // targetUrl = process.env.GOOGLE_APPS_SCRIPT_PROFILES_URL + '?action=' + action;
        // fetchMethod = 'POST'; // Ou la méthode appropriée
        // fetchBody = event.body;
        // break;

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
      headers: { "Content-Type": "application/json" }, // Les en-têtes sont souvent utiles
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
