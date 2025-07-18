// netlify/functions/get-tips-test.js

const dummyTips = [
    {
        titre: "Utiliser ChatGPT pour résumer un article",
        description: "Collez l’URL ou le contenu de l’article et demandez à ChatGPT un résumé en 3 phrases.",
        prompt: "Résume cet article en trois phrases claires et concises.",
        outil: "ChatGPT",
        categorie: "Productivité"
    },
    {
        titre: "Générer des idées de campagne marketing",
        description: "Formulez votre objectif et votre public cible, et demandez à l’IA des idées originales avec arguments.",
        prompt: "Propose 5 idées de campagne marketing créatives pour [produit/service], en précisant l’axe et la promesse.",
        outil: "Claude",
        categorie: "Marketing Digital"
    },
    {
        titre: "Tip de Test Affiché !",
        description: "Ceci est un nouveau tip que vous devriez voir si tout fonctionne.",
        prompt: "Bonjour le monde depuis Netlify Functions!",
        outil: "Netlify",
        categorie: "Test"
    }
];

export const handler = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: JSON.stringify(dummyTips),
    };
};
