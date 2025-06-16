// netlify/functions/updateProfil.mjs

import { Octokit } from "@octokit/rest"; // Importation corrigée vers @octokit/rest
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(); // Simplifié si pas de plugins spécifiques, sinon adaptez

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

    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed. This function only supports POST or PUT requests.' };
    }

    let profileToUpdate;
    try {
        profileToUpdate = JSON.parse(event.body);
        // Ajoutez des logs pour le débogage si nécessaire
        // console.log('Données de profil reçues pour mise à jour (profileToUpdate):', profileToUpdate);

        if (!profileToUpdate.id && event.httpMethod === 'PUT') {
            return { statusCode: 400, body: JSON.stringify({ message: 'ID de profil manquant pour la mise à jour.' }) };
        }
    } catch (e) {
        console.error('Erreur de parsing du corps de la requête:', e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide ou non-JSON.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        let fileData;
        try {
            const response = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: PROFILE_FILE_PATH,
                ref: 'main',
            });
            // console.log('Réponse complète de getContent:', response);
            // console.log('Données de réponse (response.data):', response.data);

            if (!response.data || !response.data.content) { // Vérification de la présence de content
                console.error('response.data.content est undefined ou nul.', response.data);
                throw new Error('Contenu de fichier non valide reçu de GitHub.');
            }

            fileData = response.data;
            // console.log('fileData après affectation:', fileData);

        } catch (error) {
            if (error.status === 404) {
                console.warn('Fichier de profils non trouvé (404), création d\'un fichier vide.');
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined };
            } else {
                console.error('Erreur lors de la récupération du fichier de profils (Octokit catch):', error);
                throw error;
            }
        }

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        let existingProfiles = JSON.parse(content);

        // Logic to update or add a profile
        const index = existingProfiles.findIndex(p => String(p.id) === String(profileToUpdate.id));

        if (index > -1) {
            existingProfiles[index] = { ...existingProfiles[index], ...profileToUpdate }; // Merge for partial updates
        } else {
            if (!profileToUpdate.id) {
                profileToUpdate.id = "_" + Math.random().toString(36).substr(2, 9); // Génère un ID unique
            }
            existingProfiles.push(profileToUpdate);
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: PROFILE_FILE_PATH,
            message: `Mise à jour du profil avec l'ID ${profileToUpdate.id || 'nouveau'}`,
            content: Buffer.from(JSON.stringify(existingProfiles, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        console.log('Fichier GitHub mis à jour avec succès.');

        // CHANGEMENT ICI : AJOUT DE success: true
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: 'Profil sauvegardé avec succès !', profile: profileToUpdate }),
        };

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil (main catch):', error);
        if (error.response) {
            console.error('Statut HTTP Octokit:', error.status);
            console.error('Données de réponse Octokit:', error.response.data);
        }
        // CHANGEMENT ICI : AJOUT DE success: false
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
