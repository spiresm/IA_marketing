// netlify/functions/get-tips.js
import { Octokit } from "@octokit/rest";
import { Buffer } from 'buffer'; // Nécessaire pour Buffer en environnement Node.js

export const handler = async (event, context) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Même token que pour save-tip.mjs
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin par défaut

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante pour la récupération des tips.' }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        // Récupérer le contenu du fichier all-tips.json
        const { data } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main' // Spécifiez la branche si ce n'est pas la branche par défaut
        });

        // Décoder le contenu base64 et le renvoyer
        const tips = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Autoriser les requêtes CORS
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(tips),
        };
    } catch (error) {
        console.error('Erreur lors de la lecture des tips depuis GitHub:', error);
        // Si le fichier n'existe pas encore, renvoyer un tableau vide au lieu d'une erreur 500
        if (error.status === 404) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify([]), // Retourne un tableau vide si le fichier n'existe pas encore
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur lors de la récupération des tips: ${error.message}` }),
        };
    }
};
