// netlify/functions/fetchNews.cjs

const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

// Un seul flux RSS de BBC News pour le test
const RSS_FEEDS = [
    { name: "BBC News Top Stories", url: "http://feeds.bbci.co.uk/news/rss.xml" }
];

const parser = new XMLParser({ ignoreAttributes: true });

exports.handler = async (event, context) => {
    console.log("📡 Lancement de fetchNews avec le flux BBC News...");

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
                if (result.rss?.channel?.item) {
                    items = Array.isArray(result.rss.channel.item)
                        ? result.rss.channel.item
                        : [result.rss.channel.item];
                } else if (result.feed?.entry) { // Pour les flux Atom au cas où
                    items = Array.isArray(result.feed.entry)
                        ? result.feed.entry
                        : [result.feed.entry];
                }

                const articles = items.map(item => ({
                    title: item.title || 'Titre inconnu',
                    url: item.link?.href || item.link || '#',
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
                "Access-Control-Allow-Origin": "*"
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
