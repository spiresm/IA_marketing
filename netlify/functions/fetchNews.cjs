const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const RSS_FEEDS = [
    { name: "Blog du Modérateur", url: "https://www.blogdumoderateur.com/feed/" },
    { name: "JDN Intelligence Artificielle", url: "https://www.journaldunet.com/web-tech/intelligence-artificielle/rss/" },
    { name: "e-marketing.fr", url: "https://www.e-marketing.fr/rss.xml" },
    { name: "Les Echos Tech & Médias", url: "https://www.lesechos.fr/tech-medias/rss.xml" },
    { name: "IA France (The AI Observer)", url: "https://ia.media.lemde.fr/rss/full.xml" } // Nouveau flux IA
];

const parser = new XMLParser({
    ignoreAttributes: true,
    htmlEntities: true // Active le décodage des entités HTML
});

exports.handler = async (event, context) => {
    console.log("📡 Lancement de fetchNews avec plusieurs flux (IA + Marketing)...");

    try {
        let allArticles = [];

        for (const feed of RSS_FEEDS) {
            try {
                const response = await fetch(feed.url);

                if (response.status === 429) {
                    console.warn(`⏳ ${feed.name} a retourné un 429 Too Many Requests. Passage au flux suivant.`);
                    continue;
                }

                if (!response.ok) {
                    console.error(`❌ ${feed.name} (${feed.url}) a échoué : ${response.status} ${response.statusText}`);
                    continue;
                }

                const xml = await response.text();
                const result = parser.parse(xml);

                let items = [];
                // Logique pour gérer les formats RSS (rss.channel.item) et Atom (feed.entry)
                if (result.rss?.channel?.item) {
                    items = Array.isArray(result.rss.channel.item)
                        ? result.rss.channel.item
                        : [result.rss.channel.item];
                } else if (result.feed?.entry) {
                    items = Array.isArray(result.feed.entry)
                        ? result.feed.entry
                        : [result.feed.entry];
                }

                const articles = items.map(item => ({
                    title: item.title || 'Titre inconnu',
                    url: item.link?.href || item.link || '#', // Gère les liens dans Atom (href) et RSS (directement link)
                    pubDate: item.pubDate || item.updated || new Date().toISOString(),
                    source: feed.name
                }));

                console.log(`✅ ${feed.name} → ${articles.length} articles récupérés`);
                allArticles = allArticles.concat(articles);

            } catch (err) {
                console.error(`❌ Erreur sur ${feed.name} (${feed.url}) :`, err.message);
            }
        }

        if (allArticles.length === 0) {
            console.warn("⚠️ Aucun article récupéré. Envoi d’un message par défaut.");
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify([{
                    title: "Aucune actualité disponible pour le moment",
                    url: "#",
                    pubDate: new Date().toISOString(),
                    source: "System"
                }])
            };
        }

        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        const topArticles = allArticles.slice(0, 15);
        console.log(`📰 Total articles final : ${topArticles.length}`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600, must-revalidate" // Cache d'1 heure
            },
            body: JSON.stringify(topArticles),
        };

    } catch (error) {
        console.error("❌ Erreur générale dans fetchNews:", error.message);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                error: "Erreur serveur",
                message: error.message
            }),
        };
    }
};
