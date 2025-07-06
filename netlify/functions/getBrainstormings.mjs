// netlify/functions/getBrainstormings.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRAINSTORM_FILE_PATH = process.env.BRAINSTORM_FILE_PATH || 'data/all-brainstormings.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration GitHub manquante.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: BRAINSTORM_FILE_PATH,
            ref: 'main',
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const brainstormings = JSON.parse(content);

        // Trier les brainstormings par date, du plus récent au plus ancien
        brainstormings.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(brainstormings),
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des brainstormings:', error);
        if (error.status === 404) {
            // Si le fichier n'existe pas, retourne un tableau vide au lieu d'une erreur 500
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
}
