// netlify/functions/fetchNews.cjs (NOTEZ L'EXTENSION .cjs !)

// Utilisez la syntaxe 'require' pour toutes les dépendances
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser'); // <-- Changement ici !

// URLs des flux RSS francophones GRATUITS choisis pour l'IA Marketing
const RSS_FEEDS = [
    { name: "Blog du Modérateur", url: "https://www.blogdumoderateur.com/feed/" },
    { name: "JDN Intelligence Artificielle", url: "https://www.journaldunet.com/web-tech/intelligence-artificielle/rss/" },
    { name: "e-marketing.fr", url: "https://www.e-marketing.fr/rss.xml" },
    { name: "Les Echos Tech & Médias", url: "https://www.lesechos.fr/tech-medias/rss.xml" }
];

// Initialisez le parser XML
const parser = new XMLParser({
    ignoreAttributes: true,     // Ignore les attributs XML
    // Pour des raisons de robustesse, on peut rendre certaines clés un tableau pour toujours avoir .item comme tableau
    // processEntities: false,  // Décommentez si vous avez des entités HTML dans les titres/descriptions
    // tagValueProcessor: (val, tagName) => tagName === "cdata" ? val : val, // Pour gérer le CDATA si besoin
});

exports.handler = async (event, context) => { // Utilisez exports.handler pour .cjs
    try {
        let allArticles = [];

        for (const feed of RSS_FEEDS) {
            try {
                const response = await fetch(feed.url);
                if (!response.ok) {
                    console.error(`Failed to fetch RSS feed from ${feed.name} (${feed.url}): ${response.status} ${response.statusText}`);
                    continue; 
                }
                const xml = await response.text();
                
                // Parsing avec fast-xml-parser
                const result = parser.parse(xml); // <-- Utilisation du nouveau parser

                // Vérification de la structure du flux et extraction des articles (adapté pour fast-xml-parser)
                // fast-xml-parser a tendance à ne pas retourner d'arrays si un seul item,
                // donc il faut toujours s'assurer que 'item' est un tableau.
                let items = [];
                if (result.rss && result.rss.channel && result.rss.channel.item) {
                    items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
                } else if (result.feed && result.feed.entry) { // Gérer aussi les flux Atom
                    items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
                }

                const articles = items.map(item => ({
                    title: item.title || 'Titre inconnu',
                    url: item.link && typeof item.link === 'object' && item.link.href ? item.link.href : item.link || '#', // Atom links sont souvent des objets
                    pubDate: item.pubDate || item.updated || new Date().toISOString(), // Atom utilise 'updated'
                    source: feed.name 
                }));
                allArticles = allArticles.concat(articles);

            } catch (feedError) {
                console.error(`Error processing RSS feed from ${feed.name} (${feed.url}):`, feedError);
            }
        }

        allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        const topArticles = allArticles.slice(0, 15); 

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Cache-Control": "public, max-age=3600, must-revalidate"
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
