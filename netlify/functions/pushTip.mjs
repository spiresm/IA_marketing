// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire pour vos opérations de fichiers

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Adaptez le chemin

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let newTip;
    try {
        newTip = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Récupérer le contenu actuel du fichier
        let fileData;
        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            fileData = response.data;
        } catch (error) {
            if (error.status === 404) {
                // Le fichier n'existe pas, commencer avec un tableau vide
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined };
            } else {
                throw error; // Lancer d'autres erreurs 
            }
        }

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const existingTips = JSON.parse(content);

        // Ajouter le nouveau tip
        const updatedTips = [...existingTips, { id: Date.now().toString(), ...newTip }]; // Ajout d'un ID simple

        // Mettre à jour le fichier sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout d'un nouveau tip`,
            content: Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64'),
            sha: fileData.sha, // `sha` est nécessaire si le fichier existe pour la mise à jour
            branch: 'main'
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip ajouté avec succès !', tip: newTip }),
        };

    } catch (error) {
        console.error('Erreur lors de l\'ajout du tip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
