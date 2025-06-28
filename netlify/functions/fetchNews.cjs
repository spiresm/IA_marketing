const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

const RSS_FEEDS = [
    { name: "Blog du Modérateur", url: "https://www.blogdumoderateur.com/feed/" },
    { name: "JDN Intelligence Artificielle", url: "https://www.journaldunet.com/web-tech/intelligence-artificielle/rss/" },
    { name: "e-marketing.fr", url: "https://www.e-marketing.fr/rss.xml" },
    { name: "Les Echos Tech & Médias", url: "https://www.lesechos.fr/tech-medias/rss.xml" }
];

const parser = new XMLParser({
    ignoreAttributes: true,
});

exports.handler = async (event, context) => {
    console.log("📡 fetchNews démarré");
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
                    console.error(`❌ Erreur HTTP ${response.status} sur ${feed.name} (${feed.url})`);
                    continue;
                }

                const xml = await response.text();
                const result = parser.parse(xml);

                let items = [];
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
                    url: item.link?.href || item.link || '#',
                    pubDate: item.pubDate || item.updated || new Date().toISOString(),
                    source: feed.name
                }));

                allArticles = allArticles.concat(articles);

            } catch (feedError) {
                console.error(`❌ Erreur lors du traitement du flux ${feed.name}:`, feedError.message);
            }
        }

        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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
        console.error("❌ Erreur générale dans fetchNews:", error);
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
