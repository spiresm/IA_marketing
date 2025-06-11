// netlify/functions/save-tip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire

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

    if (event.httpMethod !== 'POST') { // Ou 'PUT' si c'est pour la mise à jour
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let tipToSave;
    try {
        tipToSave = JSON.parse(event.body);
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
        let existingTips = JSON.parse(content);

        // Logique pour sauvegarder/mettre à jour un tip
        // Si le tip a un ID, mettez à jour l'existant, sinon ajoutez-le.
        const index = existingTips.findIndex(tip => tip.id === tipToSave.id);

        if (index > -1) {
            existingTips[index] = tipToSave; // Mise à jour
        } else {
            existingTips.push({ id: Date.now().toString(), ...tipToSave }); // Ajout avec un nouvel ID
        }

        // Mettre à jour le fichier sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Sauvegarde du tip avec l'ID ${tipToSave.id || 'nouveau'}`,
            content: Buffer.from(JSON.stringify(existingTips, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip sauvegardé avec succès !', tip: tipToSave }),
        };

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du tip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
