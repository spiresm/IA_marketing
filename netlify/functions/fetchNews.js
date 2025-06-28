import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// URLs des flux RSS francophones GRATUITS choisis pour l'IA Marketing
// Vous pouvez ajuster cette liste. Ce sont des flux publics et généralement fiables.
const RSS_FEEDS = [
    { name: "Blog du Modérateur", url: "https://www.blogdumoderateur.com/feed/" },
    { name: "JDN Intelligence Artificielle", url: "https://www.journaldunet.com/web-tech/intelligence-artificielle/rss/" },
    { name: "e-marketing.fr", url: "https://www.e-marketing.fr/rss.xml" },
    { name: "Les Echos Tech & Médias", url: "https://www.lesechos.fr/tech-medias/rss.xml" }
];

exports.handler = async (event, context) => {
    try {
        let allArticles = [];

        for (const feed of RSS_FEEDS) {
            try {
                // Récupération du flux RSS
                const response = await fetch(feed.url);
                if (!response.ok) {
                    console.error(`Failed to fetch RSS feed from ${feed.name} (${feed.url}): ${response.status} ${response.statusText}`);
                    continue; // Passe au flux suivant si celui-ci échoue
                }
                const xml = await response.text();
                
                // Parsing du XML en JavaScript Object
                const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true }); // explicitArray: false pour éviter les tableaux à un élément

                // Vérification de la structure du flux et extraction des articles
                if (result.rss && result.rss.channel && result.rss.channel.item) {
                    // Assurez-vous que item est toujours un tableau
                    const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];

                    const articles = items.map(item => ({
                        title: item.title || 'Titre inconnu',
                        url: item.link || '#',
                        pubDate: item.pubDate || new Date().toISOString(), // Date de publication
                        source: feed.name // Nom de la source
                    }));
                    allArticles = allArticles.concat(articles);
                } else if (result.feed && result.feed.entry) { // Gérer aussi les flux Atom (type <feed>)
                    const items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
                    const articles = items.map(item => ({
                        title: item.title || 'Titre inconnu',
                        url: item.link && item.link.$ && item.link.$.href ? item.link.$.href : '#',
                        pubDate: item.updated || new Date().toISOString(), // Atom utilise 'updated' ou 'published'
                        source: feed.name
                    }));
                    allArticles = allArticles.concat(articles);
                } else {
                    console.warn(`No articles found or unexpected structure in RSS/Atom feed from ${feed.name} (${feed.url})`);
                }

            } catch (feedError) {
                console.error(`Error processing RSS feed from ${feed.name} (${feed.url}):`, feedError);
            }
        }

        // Trier tous les articles par date de publication (du plus récent au plus ancien)
        allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        // Limiter au top X articles (ex: les 15 plus récents)
        const topArticles = allArticles.slice(0, 15); 

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": "public, max-age=3600, must-revalidate" // Cache la réponse pendant 1 heure pour éviter les abus
            },
            body: JSON.stringify(topArticles),
        };

    } catch (error) {
        console.error("Erreur générale dans la fonction fetchNews:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ error: "Failed to fetch IA news due to internal server error", details: error.message }),
        };
    }
};
