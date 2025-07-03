// netlify/functions/fetch-news.js

const fetch = require('node-fetch'); 

exports.handler = async function(event, context) {
    const api_key = process.env.MEDIASTACK_API_KEY; 
    const { keywords, sources, categories, languages, sort, limit } = event.queryStringParameters;

    if (!api_key) {
        console.error("Erreur: Clé API MediasStack manquante dans les variables d'environnement Netlify.");
        return {
            statusCode: 400, 
            body: JSON.stringify({ 
                error: "Missing MediasStack API key in Netlify environment variables. Please configure it.",
                details: "La clé API MediasStack n'a pas été trouvée dans les variables d'environnement de la fonction Netlify."
            })
        };
    }

    // --- MODIFICATION ICI : Mots-clés très génériques pour le test ---
    // Nous allons utiliser 'actualité' ou 'news' ou 'breaking' pour voir si des articles remontent.
    // Les sources et catégories restent vides pour ne pas restreindre la recherche.

    const testKeywords = 'actualité OR news OR breaking'; // Mots-clés très larges
    const testSources = ''; // Laisse vide pour rechercher dans toutes les sources disponibles
    const testCategories = ''; // Laisse vide pour rechercher dans toutes les catégories disponibles
    const testLanguages = 'fr,en'; // Cherche en français et anglais pour maximiser les chances
    const testLimit = 20; // Augmente la limite pour avoir plus de chances de trouver des articles

    // Utilise les paramètres de test si les paramètres originaux sont trop restrictifs
    const finalKeywords = keywords || testKeywords;
    const finalSources = sources || testSources;
    const finalCategories = categories || testCategories;
    const finalLanguages = languages || testLanguages;
    const finalLimit = limit || testLimit;

    const mediasStackUrl = `http://api.mediastack.com/v1/news?access_key=${api_key}&keywords=${encodeURIComponent(finalKeywords)}&sources=${encodeURIComponent(finalSources)}&categories=${encodeURIComponent(finalCategories)}&languages=${finalLanguages}&sort=${sort || 'published_desc'}&limit=${finalLimit}`;

    console.log("URL de requête MediasStack:", mediasStackUrl); // Utile pour le débogage Netlify Logs

    try {
        const response = await fetch(mediasStackUrl);
        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("Erreur de l'API MediasStack:", data.error || `Statut HTTP: ${response.status}`);
            return {
                statusCode: response.status !== 200 ? response.status : 400,
                body: JSON.stringify({ 
                    error: data.error ? (data.error.message || data.error) : `MediasStack API returned an error with status ${response.status}`,
                    details: data.error ? data.error.code : 'No specific error code from MediasStack'
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Erreur inattendue lors de l'appel de MediasStack via la fonction Netlify:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Failed to fetch news data through Netlify Function (unexpected error).", 
                details: error.message 
            })
        };
    }
};
