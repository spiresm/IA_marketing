// netlify/functions/deleteProfil.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const PROFILE_FILE_PATH = process.env.PROFIL_FILE_PATH || 'data/all-profils.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO).' }),
        };
    }

    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed. This function only supports DELETE requests.' };
    }

    let id;
    try {
        const parsedBody = JSON.parse(event.body);
        if (typeof parsedBody.id === 'undefined') {
            return { statusCode: 400, body: JSON.stringify({ message: 'ID de profil manquant dans le corps de la requête.' }) };
        }
        id = parsedBody.id;
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: `Corps de la requête invalide ou non-JSON: ${e.message}` }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // 1. Obtenir le contenu actuel du fichier
        // CHANGEMENT ICI : UTILISER octokit.repos.getContent DIRECTEMENT
        const { data: fileData } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: PROFILE_FILE_PATH,
            ref: 'main',
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let profils = JSON.parse(content);

        const initialLength = profils.length;
        profils = profils.filter(p => String(p.id) !== String(id));

        if (profils.length === initialLength) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `Profil avec l'ID ${id} non trouvé dans le fichier.` }),
            };
        }

        // 2. Mettre à jour le fichier sur GitHub
        // CHANGEMENT ICI : UTILISER octokit.repos.updateFile DIRECTEMENT
        await octokit.repos.updateFile({
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
            body: JSON.stringify({ message: `Profil avec l'ID ${id} supprimé avec succès.` }),
        };

    } catch (error) {
        console.error('Erreur lors de la suppression du profil via GitHub:', error.message);
        if (error.response) {
            console.error('Statut HTTP:', error.status);
            console.error('Données de réponse:', error.response.data);
        }

        if (error.status === 404) {
             return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `Fichier des profils non trouvé à ${PROFILE_FILE_PATH} ou chemin incorrect, ou erreur d'authentification.` }),
            };
        }
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
