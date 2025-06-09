// netlify/functions/proxy.mjs

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  // URLs de vos Google Apps Scripts, lues depuis les variables d'environnement Netlify.
  // La variable pour les profils s'appelle maintenant 'profils' comme vous l'avez défini.
  // L'URL des demandes est conservée telle quelle (via variable d'environnement ou fallback hardcodé).
  const PROFILES_SCRIPT_URL = process.env.profils; // <-- Utilise la variable d'environnement 'profils'
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    const action = event.queryStringParameters?.action; // Récupère l'action demandée

    let targetBaseUrl = ''; // L'URL de base de l'Apps Script à cibler
    let fetchMethod = event.httpMethod; // La méthode HTTP à utiliser pour la requête
    let fetchBody = event.body; // Le corps de la requête (pour POST)

    // Détermine quelle Apps Script cibler en fonction de l'action
    if (action === 'getProfils' || action === 'updateProfil' || action === 'deleteProfil') {
      // S'assure que l'URL des profils est bien définie
      if (!PROFILES_SCRIPT_URL) {
          console.error("Proxy.mjs: Variable d'environnement 'profils' non définie ou vide.");
          return {
              statusCode: 500,
              body: JSON.stringify({ message: "Erreur serveur: L'URL des profils n'est pas configurée." }),
          };
      }
      targetBaseUrl = PROFILES_SCRIPT_URL;
    } else if (action === 'getDemandesIA') {
      targetBaseUrl = DEMANDS_SCRIPT_URL;
    } else {
      // Si l'action n'est pas reconnue, renvoie une erreur
      console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Action non reconnue." }),
      };
    }

    const url = new URL(targetBaseUrl);
    // Ajoute le paramètre 'action' à l'URL cible
    if (action) {
      url.searchParams.append("action", action);
    }

    const fetchOptions = {
      method: fetchMethod,
      headers: {},
    };

    // Si la méthode est POST, ajoute le Content-Type et le corps de la requête
    if (fetchMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = fetchBody;
    }

    // Logs pour le débogage dans Netlify
    console.log("Proxy.mjs envoie vers :", url.toString());
    console.log("Options fetch :", fetchOptions);

    // Effectue la requête HTTP vers l'Apps Script cible
    const response = await fetch(url.toString(), fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");

    // Parse la réponse en JSON ou en texte brut
    const body = isJSON ? await response.json() : await response.text();

    // Log de la réponse brute reçue
    console.log("Proxy.mjs reçoit :", body);

    // Retourne la réponse au frontend
    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*", // Important pour les requêtes Cross-Origin (CORS)
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": isJSON ? "application/json" : "text/plain",
      },
      body: isJSON ? JSON.stringify(body) : body, // Stringifie le corps si c'est du JSON
    };
  } catch (error) {
    console.error("Erreur dans proxy.mjs :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
    };
  }
};
