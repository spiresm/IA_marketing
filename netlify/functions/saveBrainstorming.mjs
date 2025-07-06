// netlify/functions/saveBrainstorming.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRAINSTORM_FILE_PATH = process.env.BRAINSTORM_FILE_PATH || 'data/all-brainstormings.json'; // Chemin du fichier JSON

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration GitHub manquante.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    const method = event.httpMethod;
    const brainstormIdToDelete = event.queryStringParameters.id; // Pour la suppression

    try {
        // Récupérer le contenu actuel du fichier
        let sha = null;
        let brainstormings = [];
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: BRAINSTORM_FILE_PATH,
                ref: 'main',
            });
            sha = data.sha;
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            brainstormings = JSON.parse(content);
        } catch (error) {
            // Si le fichier n'existe pas (404), on commence avec un tableau vide
            if (error.status !== 404) {
                throw error; // Rejeter les autres erreurs
            }
        }

        let newContent;
        let message;

        if (method === 'POST') {
            const newBrainstorm = JSON.parse(event.body);
            const existingIndex = brainstormings.findIndex(b => b.id === newBrainstorm.id);

            if (existingIndex !== -1) {
                // Mise à jour d'un brainstorming existant
                brainstormings[existingIndex] = newBrainstorm;
                message = `Mise à jour du brainstorming "${newBrainstorm.name}"`;
            } else {
                // Ajout d'un nouveau brainstorming
                brainstormings.push(newBrainstorm);
                message = `Ajout du brainstorming "${newBrainstorm.name}"`;
            }
            newContent = JSON.stringify(brainstormings, null, 2);
        } else if (method === 'DELETE') {
            if (!brainstormIdToDelete) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'ID du brainstorming manquant pour la suppression.' }),
                };
            }
            const initialLength = brainstormings.length;
            brainstormings = brainstormings.filter(b => b.id !== brainstormIdToDelete);
            if (brainstormings.length === initialLength) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Brainstorming non trouvé.' }),
                };
            }
            newContent = JSON.stringify(brainstormings, null, 2);
            message = `Suppression du brainstorming avec l'ID ${brainstormIdToDelete}`;
        } else {
            return {
                statusCode: 405,
                body: JSON.stringify({ message: 'Méthode non autorisée.' }),
            };
        }

        // Mettre à jour le fichier sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: BRAINSTORM_FILE_PATH,
            message: message,
            content: Buffer.from(newContent).toString('base64'),
            sha: sha, // Indispensable pour la mise à jour
            branch: 'main',
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: newContent,
        };
    } catch (error) {
        console.error('Erreur dans saveBrainstorming:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
