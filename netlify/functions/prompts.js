// netlify/functions/prompts.mjs

// Ce fichier semble être une copie ou une fonction similaire à getPrompts.mjs.
// Si son but est le même, utilisez le code de getPrompts.mjs.
// Si son but est différent (ex: créer/modifier des prompts), adaptez la logique en conséquence.

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire

const MyOctokit = Octokit.plugin(restEndpointMethods);

// Utilisation de la syntaxe ES Module pour l'exportation du handler
export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const PROMPTS_FILE_PATH = process.env.PROMPTS_FILE_PATH || 'data/prompts.json'; // Adaptez le chemin

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Logique de votre fonction prompts.mjs
        // Si elle récupère des prompts (comme getPrompts), la logique ci-dessous est valide.
        // Si elle fait une autre action (POST, PUT, etc.), adaptez-la.
        const { data } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: PROMPTS_FILE_PATH,
            ref: 'main',
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const prompts = JSON.parse(content);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(prompts),
        };
    } catch (error) {
        console.error('Erreur dans la fonction prompts:', error);
        if (error.status === 404) {
            return {
                statusCode: 200, // Retourne 200 avec tableau vide si le fichier n'existe pas
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
}
