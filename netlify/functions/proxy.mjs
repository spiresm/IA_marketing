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
        targetUrl = '/.netlify/functions/getProfils'; // Appelle une fonction locale pour les profils
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action; // Appelle une API externe (Google Apps Script)
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil'; // Appelle une fonction locale pour la mise à jour de profil
        isLocalFunctionCall = true;
        break;

      case 'getGalleryPrompts':
        targetUrl = '/.netlify/functions/getGalleryPrompts'; // Appelle une fonction locale pour les prompts de galerie
        isLocalFunctionCall = true;
        break;

      case 'saveTip': // <--- NOUVEAU CAS POUR LA SAUVEGARDE DE TIP
        targetUrl = '/.netlify/functions/saveTip'; // Appelle une fonction locale pour sauvegarder un tip
        isLocalFunctionCall = true;
        // Pour les appels POST vers des fonctions locales, il est important de conserver le body original
        // et la méthode HTTP. Ces deux variables sont déjà initialisées en haut du try block.
        break;

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
        // Important: si le body est un JSON, le Content-Type doit être réglé pour la requête
        // vers la fonction cible. Netlify gère généralement bien le proxy, mais c'est une bonne pratique.
      },
    };

    if (fetchBody && fetchMethod === "POST") { // Assurez-vous d'envoyer le body seulement si POST et s'il existe
      fetchOptions.headers["Content-Type"] = "application/json"; // Indique que le corps est du JSON
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
        "Access-Control-Allow-Origin": "*", // Autorise toutes les origines pour les requêtes CORS
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS", // Autorise les méthodes GET, POST, OPTIONS
        "Access-Control-Allow-Headers": "Content-Type", // Autorise l'en-tête Content-Type
        "Content-Type": isJSON ? "application/json" : "text/plain", // Définit le type de contenu de la réponse
      },
      body: isJSON ? JSON.stringify(body) : body, // Renvoie le corps encodé en JSON si c'est du JSON
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
