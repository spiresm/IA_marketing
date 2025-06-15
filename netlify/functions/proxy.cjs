const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL ||
    'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

  try {
    let action = event.queryStringParameters?.action;
    let requestBody = {};

    // Gérer les requêtes POST : parser le corps et extraire l'action si présente
    if (event.httpMethod === "POST" && event.body) {
      try {
        requestBody = JSON.parse(event.body);
        if (requestBody.action) {
          action = requestBody.action; // L'action peut être dans le corps pour les POST
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
    let fetchMethod = event.httpMethod; // Par défaut, utiliser la méthode HTTP de l'événement entrant
    let fetchBody = event.body; // Par défaut, transmettre le corps brut de l'événement POST

    let isLocalFunctionCall = false; // Indique si la requête est pour une autre fonction Netlify locale

    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getProfils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        // Pour 'getDemandesIA', c'est un GET. L'action est en queryString.
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = "GET"; // S'assurer que c'est un GET
        fetchBody = null; // Pas de corps pour un GET
        break;

      case 'updateDemandeIA':
      case 'sendRequest':
        // Pour ces actions, l'URL de base du script GAS est suffisante avec l'action en paramètre.
        // Le corps de la requête (event.body) contient déjà les données nécessaires.
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action; // Action passée en paramètre d'URL pour GAS doGet/doPost dispatch
        fetchMethod = "POST"; // On s'attend à ce que ces actions soient des POST
        fetchBody = event.body; // Le corps de l'original contient les données JSON
        break;

      case 'deleteDemande': // <-- **C'EST LA LIGNE CLÉ CORRIGÉE POUR L'ACTION DE SUPPRESSION**
        if (!requestBody.id) {
          console.error("ID de la demande manquant pour l'action deleteDemande.");
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "ID de la demande manquant pour la suppression." }),
          };
        }
        // L'Apps Script s'attend à un POST avec l'action et l'ID dans le corps JSON.
        targetUrl = DEMANDS_SCRIPT_URL; // L'URL de base du script Apps Script
        fetchMethod = "POST"; // Forcer la méthode à POST
        fetchBody = JSON.stringify({ // Créer le corps JSON attendu par l'Apps Script
          action: "deleteDemande",
          id: requestBody.id
        });
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil';
        isLocalFunctionCall = true;
        break;

      default:
        console.warn(`Proxy.cjs: Action non reconnue ou manquante: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Action non reconnue ou manquante.", actionReçue: action }),
        };
    }

    const fullTargetUrl = isLocalFunctionCall
      ? new URL(targetUrl, `https://${event.headers.host}`).toString() // Construire l'URL complète pour les fonctions locales
      : targetUrl; // Utiliser l'URL directement pour les appels externes (GAS)

    const fetchOptions = {
      method: fetchMethod,
      headers: {}, // Les headers seront ajoutés après
    };

    // Ajouter le corps de la requête et le Content-Type seulement pour les méthodes qui le nécessitent
    if (fetchBody && (fetchMethod === "POST" || fetchMethod === "PUT" || fetchMethod === "PATCH")) {
      fetchOptions.headers["Content-Type"] = "application/json"; // S'assurer que c'est JSON
      fetchOptions.body = fetchBody;
    }

    // Facultatif : Indiquer qu'on attend du JSON en retour
    fetchOptions.headers["Accept"] = "application/json";

    console.log("Proxy.cjs envoie vers :", fullTargetUrl);
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(fullTargetUrl, fetchOptions);
    const rawText = await response.text(); // Lire la réponse en texte brut

    let body;
    try {
      body = JSON.parse(rawText); // Tenter de parser en JSON
    } catch (err) {
      console.warn("Réponse non-JSON, renvoi du texte brut.");
      body = rawText; // Si échec, renvoyer le texte brut
    }

    console.log("Proxy.cjs reçoit :", body);

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permettre l'accès depuis n'importe quelle origine (CORS)
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", // Méthodes autorisées
        "Access-Control-Allow-Headers": "Content-Type", // Headers autorisés
        "Content-Type": typeof body === "object" ? "application/json" : "text/plain", // Définir le type de contenu de la réponse
      },
      body: typeof body === "object" ? JSON.stringify(body) : body, // Renvoyer le corps formaté
    };

  } catch (error) {
    console.error("Erreur générale dans proxy.cjs :", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
    };
  }
};
