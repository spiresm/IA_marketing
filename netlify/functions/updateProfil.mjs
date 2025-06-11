// netlify/functions/updateProfil.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Keep if necessary for file operations

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const PROFILE_FILE_PATH = process.env.PROFIL_FILE_PATH || 'data/all-profils.json'; // Adjust path if needed

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') { // Or 'PUT' if it's for update
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let profileToUpdate;
    try {
        profileToUpdate = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Fetch the current content of the file
        let fileData;
        try {
            const response = await octokit.rest.repos.getContent({
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
                throw error; // Re-throw other errors
            }
        }

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let existingProfiles = JSON.parse(content);

        // Logic to update or add a profile
        const index = existingProfiles.findIndex(p => p.id === profileToUpdate.id);

        if (index > -1) {
            existingProfiles[index] = profileToUpdate; // Update existing profile
        } else {
            existingProfiles.push({ id: Date.now().toString(), ...profileToUpdate }); // Add new profile with a simple ID
        }

        // Update the file on GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
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
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
