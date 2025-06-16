// netlify/functions/updateProfil.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire, mais Buffer est global en Node.js

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const PROFILE_FILE_PATH = process.env.PROFIL_FILE_PATH || 'data/all-profils.json'; // Ajustez le chemin si nécessaire

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    // La méthode HTTP devrait être 'POST' pour créer et 'PUT' pour mettre à jour
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed. This function only supports POST or PUT requests.' };
    }

    let profileToUpdate;
    try {
        profileToUpdate = JSON.parse(event.body);
        // Assurez-vous qu'un ID est présent si c'est une mise à jour, ou si vous voulez le générer ici
        if (!profileToUpdate.id && event.httpMethod === 'PUT') {
            return { statusCode: 400, body: JSON.stringify({ message: 'ID de profil manquant pour la mise à jour.' }) };
        }
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide ou non-JSON.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Fetch the current content of the file
        let fileData;
        try {
            // CHANGEMENT ICI : UTILISER octokit.repos.getContent DIRECTEMENT
            const response = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: PROFILE_FILE_PATH,
                ref: 'main',
            });
            fileData = response.data;
        } catch (error) {
            if (error.status === 404) {
                // If the file doesn't exist, start with an empty array
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined };
            } else {
                console.error('Erreur lors de la récupération du fichier de profils:', error);
                throw error; // Re-throw other errors
            }
        }

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let existingProfiles = JSON.parse(content);

        // Logic to update or add a profile
        const index = existingProfiles.findIndex(p => String(p.id) === String(profileToUpdate.id)); // Convertir en chaîne pour une comparaison fiable

        if (index > -1) {
            existingProfiles[index] = profileToUpdate; // Update existing profile
        } else {
            // Si c'est un nouveau profil (pas d'ID existant), ajoutez-le avec un nouvel ID
            if (!profileToUpdate.id) {
                profileToUpdate.id = Date.now().toString(); // Génère un ID simple basé sur le timestamp
            }
            existingProfiles.push(profileToUpdate); // Add new profile
        }

        // Update the file on GitHub
        // CHANGEMENT ICI : UTILISER octokit.repos.createOrUpdateFileContents DIRECTEMENT
        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: PROFILE_FILE_PATH,
            message: `Mise à jour du profil avec l'ID ${profileToUpdate.id || 'nouveau'}`,
            content: Buffer.from(JSON.stringify(existingProfiles, null, 2)).toString('base64'),
            sha: fileData.sha, // `sha` is required if the file exists for updating
            branch: 'main'
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Profil sauvegardé avec succès !', profile: profileToUpdate }),
        };

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
        if (error.response) { // Log des détails d'erreur Octokit
            console.error('Statut HTTP:', error.status);
            console.error('Données de réponse:', error.response.data);
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
