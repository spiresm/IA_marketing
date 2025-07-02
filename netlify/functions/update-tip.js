// netlify/functions/update-tip.js
// Cette fonction gérera la mise à jour d'un tip en modifiant le fichier all-tips.json sur GitHub.

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
// REMOVED: import multiparty from 'multiparty';
// REMOVED: import fs from 'fs/promises';
// REMOVED: import { Readable } from 'stream';
import fetch from 'node-fetch'; // Nécessaire si le fichier all-tips.json est > 1MB

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event) => {
    console.log("------------------- Début de l'exécution de update-tip.js -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, 
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'PUT') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
            headers: {
                'Allow': 'PUT, OPTIONS',
                'Access-Control-Allow-Origin': '*',
            }
        };
    }

    let tipData = {};

    try {
        // NOUVEAU : Parse directement le corps JSON envoyé par le frontend
        tipData = JSON.parse(event.body); 
        console.log("📡 updateTip: Données JSON reçues du frontend:", tipData);

    } catch (e) {
        console.error('❌ updateTip: Erreur de parsing du corps de la requête JSON:', e);
        return { 
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Format de requête invalide: ${e.message || 'Le corps doit être un JSON valide.'}` }) 
        };
    }

    const { id, sha, ...fieldsToUpdate } = tipData;

    if (!id || !sha) {
        console.warn('⚠️ updateTip: ID ou SHA du tip manquant pour la mise à jour.');
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'ID ou SHA du tip manquant. Impossible de mettre à jour.' })
        };
    }
    
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; 
    // GITHUB_IMAGE_PATH_CONST n'est plus pertinent ici car l'upload est via uploadMedia.js

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error("❌ updateTip: Configuration GitHub (TOKEN, OWNER, REPO) manquante.");
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Configuration GitHub manquante. Contactez l\'administrateur.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Assurer les valeurs par défaut et normaliser
        fieldsToUpdate.date_modification = new Date().toISOString();
        fieldsToUpdate.previewText = fieldsToUpdate.previewText || "";
        fieldsToUpdate.promptText = fieldsToUpdate.promptText || "";
        fieldsToUpdate.categorie = fieldsToUpdate.categorie || "Autre";
        fieldsToUpdate.outil = fieldsToUpdate.outil || "";
        fieldsToUpdate.urls = fieldsToUpdate.urls || [];
        
        // --- NOUVEAU : GESTION DE imageUrl et videoThumbnailUrl ---
        fieldsToUpdate.imageUrl = fieldsToUpdate.imageUrl || null; // L'URL principale (vidéo ou image)
        fieldsToUpdate.videoThumbnailUrl = fieldsToUpdate.videoThumbnailUrl || null; // L'URL de la miniature (pour les vidéos)
        // fileUrls est maintenant dérivé de imageUrl ou de videoThumbnailUrl si imageUrl est une vidéo
        fieldsToUpdate.fileUrls = fieldsToUpdate.fileUrls || []; 
        if (fieldsToUpdate.imageUrl && fieldsToUpdate.fileUrls.length === 0) {
            fieldsToUpdate.fileUrls.push(fieldsToUpdate.imageUrl);
        }
        if (fieldsToUpdate.videoThumbnailUrl && !fieldsToUpdate.fileUrls.includes(fieldsToUpdate.videoThumbnailUrl)) {
            // Optionnel: ajouter la miniature aux fileUrls si vous voulez qu'elle soit dans cette liste générique
            // fieldsToUpdate.fileUrls.push(fieldsToUpdate.videoThumbnailUrl); 
        }
        // --- FIN NOUVEAU ---

        // --- Logique pour lire, modifier et écrire le fichier JSON sur GitHub ---
        let existingContent = '';
        let fileMetadata;
        let existingTips = [];
        let fetchedFileSha = null;

        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            fileMetadata = response.data;
            fetchedFileSha = fileMetadata.sha; // Le SHA actuel du fichier

            if (fileMetadata.content && fileMetadata.encoding === 'base64') {
                existingContent = Buffer.from(fileMetadata.content, 'base64').toString('utf8');
            } else if (fileMetadata.download_url) {
                const rawResponse = await fetch(fileMetadata.download_url);
                if (!rawResponse.ok) throw new Error(`Failed to download raw content: ${rawResponse.statusText}`);
                existingContent = await rawResponse.text();
            } else {
                throw new Error('Impossible de récupérer le contenu du fichier tips: Format de réponse GitHub inattendu.');
            }
            existingTips = JSON.parse(existingContent);
            if (!Array.isArray(existingTips)) {
                console.warn("⚠️ updateTip: Le contenu JSON existant n'est pas un tableau. Il sera écrasé.");
                existingTips = [];
            }
            console.log(`✅ updateTip: Fichier ${TIPS_FILE_PATH} récupéré et parsé.`);

        } catch (error) {
            if (error.status === 404) {
                console.error(`❌ updateTip: Le fichier ${TIPS_FILE_PATH} n'existe pas sur GitHub.`);
                return {
                    statusCode: 404,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ success: false, message: `Le fichier de tips (${TIPS_FILE_PATH}) n'existe pas. Impossible de mettre à jour.` }),
                };
            } else {
                console.error("❌ updateTip: Erreur lors de la récupération du fichier JSON existant:", error);
                throw error; 
            }
        }

        const tipIndex = existingTips.findIndex(tip => String(tip.id) === String(id));

        if (tipIndex === -1) {
            console.error(`❌ updateTip: Tip avec l'ID ${id} non trouvé dans le fichier.`);
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ success: false, message: `Tip avec l'ID ${id} non trouvé pour la mise à jour.` }),
            };
        }

        // Mettre à jour les champs du tip existant avec les nouvelles données
        existingTips[tipIndex] = {
            ...existingTips[tipIndex], 
            ...fieldsToUpdate,         
            id: String(id),            
            date_modification: fieldsToUpdate.date_modification 
        };
        existingTips[tipIndex].parentFileSha = fetchedFileSha; 


        const updatedContent = Buffer.from(JSON.stringify(existingTips, null, 2)).toString('base64');
        const commitMessage = `Mise à jour du tip "${fieldsToUpdate.titre || 'Sans titre'}" (ID: ${id})`;

        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: commitMessage,
            content: updatedContent,
            sha: fetchedFileSha, 
            branch: 'main',
        });

        console.log(`✅ updateTip: Fichier JSON des tips mis à jour sur GitHub. Tip ${id} modifié.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ 
                message: 'Tip mis à jour avec succès !', 
                tip: existingTips[tipIndex], 
                parentFileSha: fetchedFileSha 
            }),
        };

    } catch (error) {
        console.error('❌ updateTip: Erreur lors de la mise à jour du tip sur GitHub:', error);
        if (error.status === 409) {
            return {
                statusCode: 409,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: `Conflit de version. Le workflow a été modifié par un autre processus. Veuillez recharger et réessayer.` }),
            };
        }
        return {
            statusCode: error.status || 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: `Erreur interne du serveur lors de la mise à jour: ${error.message || 'Une erreur inconnue est survenue.'}` }),
        };
    } finally {
        console.log("------------------- Fin de l'exécution de update-tip.js -------------------");
    }
};
