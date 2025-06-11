// netlify/functions/deleteProfil.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire pour vos opérations de fichiers

const MyOctokit = Octokit.plugin(restEndpointMethods);

// Utilisation de la syntaxe ES Module pour l'exportation du handler
export async function handler(event) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const PROFILE_FILE_PATH = process.env.PROFIL_FILE_PATH || 'data/all-profils.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let id;
    try {
        id = JSON.parse(event.body).id;
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: PROFILE_FILE_PATH,
            ref: 'main',
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let profils = JSON.parse(content);

        const initialLength = profils.length;
        profils = profils.filter(p => p.id !== id);

        if (profils.length === initialLength) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `Profil avec l'ID ${id} non trouvé.` }),
            };
        }

        await octokit.rest.repos.updateFile({
            owner: OWNER,
            repo: REPO,
            path: PROFILE_FILE_PATH,
            message: `Suppression du profil avec l'ID ${id}`,
            content: Buffer.from(JSON.stringify(profils, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `Profil avec l'ID ${id} supprimé.` }),
        };

    } catch (error) {
        console.error('Erreur lors de la suppression du profil:', error);
        if (error.status === 404) {
             return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: 'Fichier des profils non trouvé ou chemin incorrect.' }),
            };
        }
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
