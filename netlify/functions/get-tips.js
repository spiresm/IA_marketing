// netlify/functions/get-tips.mjs
import { Octokit } from "@octokit/core"; // Corrected import
import { rest } from "@octokit/plugin-rest"; // Corrected import
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(rest); // Create an Octokit instance with the rest plugin

export const handler = async (event, context) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN }); // Use MyOctokit here

    try {
        const response = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main', 
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        const tips = JSON.parse(content);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", 
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(tips),
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des tips:', error);
        if (error.status === 404) {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify([]),
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
};
