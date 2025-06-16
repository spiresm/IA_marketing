// netlify/functions/save-tip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin vers votre fichier JSON de tips

    // *** NOUVELLE VARIABLE : Chemin pour stocker les images ***
    // C'est le dossier DANS votre dépôt GitHub où les images seront enregistrées.
    // Assurez-vous que ce chemin est accessible publiquement par votre site (ex: public/images/tips)
    const IMAGES_DIR_PATH = process.env.IMAGES_DIR_PATH || 'public/images/tips'; // ADAPTEZ CE CHEMIN !

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO).' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let tipToSave;
    try {
        tipToSave = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    const branch = 'main'; // Assurez-vous que c'est la bonne branche (souvent 'main' ou 'master')

    try {
        const imageUrls = []; // Tableau pour stocker les URLs des images sauvegardées sur GitHub

        // --- Début du traitement des images ---
        if (tipToSave.filesData && tipToSave.filesData.length > 0) {
            for (const file of tipToSave.filesData) {
                // S'assurer que 'data' est une chaîne Base64 et non vide
                if (file.data && typeof file.data === 'string') {
                    // Extraire la partie Base64 pure (après le "data:image/png;base64," si présent)
                    const base64Content = file.data.includes(',') ? file.data.split(',')[1] : file.data;

                    // Générer un nom de fichier unique pour éviter les collisions
                    const uniqueFileName = `${tipToSave.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.fileName}`;
                    const imagePath = `${IMAGES_DIR_PATH}/${uniqueFileName}`; // Chemin complet du fichier sur GitHub

                    try {
                        // Tenter de créer le fichier image sur GitHub
                        await octokit.rest.repos.createOrUpdateFileContents({
                            owner: OWNER,
                            repo: REPO,
                            path: imagePath,
                            message: `feat: Add image ${uniqueFileName} for tip ${tipToSave.id}`,
                            content: base64Content, // Le contenu Base64 pur de l'image
                            branch: branch
                        });

                        // Construire l'URL publique de l'image (pour l'affichage sur le site)
                        // L'URL 'raw.githubusercontent.com' est pour le contenu brut, Netlify le servira ensuite via son CDN.
                        const rawImageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${imagePath}`;
                        imageUrls.push(rawImageUrl);
                        console.log(`Image ${uniqueFileName} sauvegardée sur GitHub.`);

                    } catch (githubFileError) {
                        console.error(`Erreur lors de la sauvegarde de l'image ${uniqueFileName} sur GitHub:`, githubFileError);
                        // Vous pouvez choisir de renvoyer une erreur ici ou de continuer
                        // Si vous continuez, l'image ne sera pas dans `imageUrls`
                    }
                } else {
                    console.warn(`Fichier ${file.fileName} n'a pas de données Base64 valides.`);
                }
            }
        }
        // --- Fin du traitement des images ---

        // Récupérer le contenu actuel du fichier JSON de tips
        let fileDataResponse;
        let existingTipsContent = '[]';
        let existingTipsSha;

        try {
            fileDataResponse = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: branch,
            });
            existingTipsContent = Buffer.from(fileDataResponse.data.content, 'base64').toString('utf8');
            existingTipsSha = fileDataResponse.data.sha;
        } catch (error) {
            if (error.status === 404) {
                // Le fichier n'existe pas, initialiser avec un tableau vide
                console.log(`Fichier ${TIPS_FILE_PATH} non trouvé, création d'un nouveau.`);
            } else {
                console.error('Erreur inattendue lors de la récupération du fichier JSON des tips:', error);
                throw error;
            }
        }

        let existingTips = JSON.parse(existingTipsContent);

        // Préparer le tip avec les URLs des images
        const newTip = {
            id: tipToSave.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Génère un ID si non fourni
            ...tipToSave,
            images: imageUrls, // AJOUT DE L'URL DES IMAGES ICI !
            timestamp: new Date().toISOString() // Ajout d'un horodatage
        };
        // Supprimer filesData du tip avant de le sauvegarder dans le JSON pour ne pas surcharger le fichier
        delete newTip.filesData;

        // Logique pour sauvegarder/mettre à jour un tip
        const index = existingTips.findIndex(tip => tip.id === newTip.id);

        if (index > -1) {
            existingTips[index] = newTip; // Mise à jour
        } else {
            existingTips.push(newTip); // Ajout
        }

        // Mettre à jour le fichier JSON de tips sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Sauvegarde du tip "${newTip.titre}" avec l'ID ${newTip.id}`,
            content: Buffer.from(JSON.stringify(existingTips, null, 2)).toString('base64'),
            sha: existingTipsSha, // Important pour la concurrence
            branch: branch
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Tip et images sauvegardés avec succès !',
                tip: newTip,
                imageUrls: imageUrls // Renvoyer les URLs des images au frontend
            }),
        };

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du tip ou des images:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
