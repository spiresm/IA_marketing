// netlify/functions/fetch-news.js

// Importation de node-fetch pour faire des requêtes HTTP côté serveur
// Assurez-vous que 'node-fetch' est bien listé dans les dépendances de votre package.json
// et que vous avez exécuté 'npm install node-fetch' à la racine de votre projet.
const fetch = require('node-fetch'); 

// La fonction principale qui sera exécutée par Netlify Functions
// `event` contient les informations de la requête HTTP entrante (ex: paramètres d'URL)
// `context` contient les informations sur l'environnement d'exécution (pas utilisé ici mais toujours présent)
exports.handler = async function(event, context) {
    // --- Récupération de la clé API depuis les variables d'environnement Netlify ---
    // C'est la méthode sécurisée pour accéder à la clé.
    const api_key = process.env.MEDIASTACK_API_KEY; 

    // Récupérer les autres paramètres de l'URL passés par votre page web
    const { keywords, sources, categories, languages, sort, limit } = event.queryStringParameters;

    // --- Vérification de la clé API ---
    // Si la clé API est manquante ou vide (par exemple, si la variable d'environnement n'est pas configurée),
    // on renvoie une erreur.
    if (!api_key) {
        console.error("Erreur: Clé API MediasStack manquante dans les variables d'environnement Netlify.");
        return {
            statusCode: 400, // Code 400 signifie "Bad Request" (requête invalide)
            body: JSON.stringify({ 
                error: "Missing MediasStack API key in Netlify environment variables. Please configure it.",
                details: "La clé API MediasStack n'a pas été trouvée dans les variables d'environnement de la fonction Netlify."
            })
        };
    }

    // --- Construction de l'URL de l'API MediasStack ---
    // Utilisation de encodeURIComponent pour s'assurer que les mots-clés et sources sont bien encodés pour l'URL
    const mediasStackUrl = `http://api.mediastack.com/v1/news?access_key=${api_key}&keywords=${encodeURIComponent(keywords || '')}&sources=${encodeURIComponent(sources || '')}&categories=${encodeURIComponent(categories || '')}&languages=${languages || 'en'}&sort=${sort || 'published_desc'}&limit=${limit || 6}`;

    try {
        // --- Exécution de la requête HTTP vers l'API MediasStack ---
        const response = await fetch(mediasStackUrl);
        const data = await response.json(); // Tente de parser la réponse comme du JSON

        // --- Gestion des réponses de l'API MediasStack ---
        // MediasStack peut renvoyer un statut HTTP 200 (OK) même si une erreur est présente dans le corps JSON (par exemple, limites atteintes)
        // Il est donc important de vérifier la propriété 'error' dans les données JSON.
        if (!response.ok || data.error) {
            console.error("Erreur de l'API MediasStack:", data.error || `Statut HTTP: ${response.status}`);
            return {
                statusCode: response.status !== 200 ? response.status : 400, // Garde le statut HTTP de MediasStack ou 400 si l'erreur est dans le JSON
                body: JSON.stringify({ 
                    error: data.error ? (data.error.message || data.error) : `MediasStack API returned an error with status ${response.status}`,
                    details: data.error ? data.error.code : 'No specific error code from MediasStack'
                })
            };
        }

        // --- Succès : Renvoi des données à la page web ---
        return {
            statusCode: 200, // Code 200 signifie "OK"
            headers: {
                "Content-Type": "application/json", // Indique que la réponse est au format JSON
                // Les en-têtes CORS sont CRUCIAUX pour permettre à votre frontend d'accéder à cette fonction.
                "Access-Control-Allow-Origin": "*", // À adapter à votre domaine spécifique en production (ex: "https://iamarketing.netlify.app")
                "Access-Control-Allow-Methods": "GET", // Permet la méthode GET
                "Access-Control-Allow-Headers": "Content-Type", // Permet l'en-tête Content-Type
            },
            body: JSON.stringify(data) // Convertit les données JSON en chaîne de caractères pour le corps de la réponse
        };

    } catch (error) {
        // --- Gestion des erreurs inattendues (ex: problème réseau, JSON invalide) ---
        console.error("Erreur inattendue lors de l'appel de MediasStack via la fonction Netlify:", error);
        return {
            statusCode: 500, // Code 500 signifie "Internal Server Error" (erreur interne du serveur)
            body: JSON.stringify({ 
                error: "Failed to fetch news data through Netlify Function (unexpected error).", 
                details: error.message 
            })
        };
    }
};
