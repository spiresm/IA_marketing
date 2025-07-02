// netlify/functions/update-tip.js
// Cette fonction gérera la mise à jour d'un tip en modifiant le fichier all-tips.json sur GitHub.

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty';
import fs from 'fs/promises';
import { Readable } from 'stream';
import fetch from 'node-fetch'; // Nécessaire si le fichier all-tips.json est > 1MB et doit être téléchargé via download_url

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event) => {
    console.log("------------------- Début de l'exécution de update-tip.js -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);

    // Gère les requêtes OPTIONS (preflight) pour CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS', // Seulement PUT et OPTIONS pour cette fonction
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

    let fields = {}; // Pour stocker les champs du formulaire textuels
    let files = {}; // Pour stocker les fichiers du formulaire uploadés

    // Préparation du stream de la requête pour multiparty
    const form = new multiparty.Form();
    const requestStream = new Readable();
    requestStream.push(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8'));
    requestStream.push(null);
    requestStream.headers = event.headers;
    requestStream.method = event.httpMethod;

    try {
        // Parse la requête multipart/form-data
        await new Promise((resolve, reject) => {
            form.parse(requestStream, (err, parsedFields, parsedFiles) => {
                if (err) {
                    console.error('❌ updateTip: Erreur de parsing du formulaire multipart/form-data:', err);
                    return reject(err);
                }
                fields = parsedFields;
                files = parsedFiles;
                resolve();
            });
        });

        // Transforme les champs parsés par multiparty en un objet simple
        let tipData = {};
        for (const key in fields) {
            if (fields[key] && fields[key].length > 0) {
                // Gère spécifiquement le champ 'urls' qui est envoyé comme chaîne JSON
                if (key === 'urls') {
                    try {
                        tipData[key] = JSON.parse(fields[key][0]);
                    } catch (e) {
                        console.error(`❌ updateTip: Erreur de parsing du champ 'urls': ${fields[key][0]}`, e);
                        tipData[key] = [];
                    }
                } else {
                    tipData[key] = fields[key][0];
                }
            }
        }

        const { id, sha, ...fieldsToUpdate } = tipData; // On a besoin de 'id' et 'sha' du tip pour GitHub

        if (!id || !sha) {
            console.warn('⚠️ updateTip: ID ou SHA du tip manquant pour la mise à jour.');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'ID ou SHA du tip manquant. Impossible de mettre à jour.' })
            };
        }
        
        // --- Variables d'environnement GitHub ---
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const OWNER = process.env.GITHUB_OWNER;
        const REPO = process.env.GITHUB_REPO;
        const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin vers votre fichier JSON principal
        const GITHUB_IMAGE_PATH_CONST = 'assets/images'; // Chemin pour les images sur GitHub

        if (!GITHUB_TOKEN || !OWNER || !REPO) {
            console.error("❌ updateTip: Configuration GitHub (TOKEN, OWNER, REPO) manquante.");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Configuration GitHub manquante. Contactez l\'administrateur.' }),
            };
        }

        const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
        let newImageUrl = fieldsToUpdate.imageUrl || null; // L'URL de l'image peut venir d'une image existante ou d'un upload séparé
        let newFileUrls = fieldsToUpdate.fileUrls || []; // Assure que c'est un tableau

        // --- Gérer l'upload d'une nouvelle image si présente dans le FormData ---
        // Cette logique est similaire à pushTip.mjs
        if (files && files.files && files.files.length > 0) {
            console.log(`📡 updateTip: ${files.files.length} fichier(s) image/document détecté(s) pour upload.`);
            const file = files.files[0]; // Pour l'instant, prends seulement le premier fichier
            
            if (!file.path) { // Assurez-vous que le fichier temporaire existe
                console.warn(`⚠️ updateTip: Fichier temporaire non trouvé pour ${file.originalFilename}. Ignoré.`);
            } else if (file.headers['content-type'].startsWith('image/')) {
                const fileBuffer = await fs.readFile(file.path);
                const base64Data = fileBuffer.toString('base64');
                const safeFileName = file.originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const uniqueFileName = `${Date.now()}-${safeFileName}`;
                const filePathInRepo = `${GITHUB_IMAGE_PATH_CONST}/${uniqueFileName}`;
                
                try {
                    await octokit.rest.repos.createOrUpdateFileContents({
                        owner: OWNER,
                        repo: REPO,
                        path: filePathInRepo,
                        message: `Mise à jour de l'image pour le tip ${id}`,
                        content: base64Data,
                        branch: 'main',
                    });
                    newImageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePathInRepo}`;
                    newFileUrls = [newImageUrl]; // Si c'est une nouvelle image principale, on met à jour le tableau fileUrls avec elle seule
                    console.log(`✅ updateTip: Nouvelle image principale uploadée: ${newImageUrl}`);
                } catch (fileUploadError) {
                    console.error(`❌ updateTip: Erreur lors de l'upload de la nouvelle image à GitHub:`, fileUploadError);
                    // L'erreur sera gérée par le catch principal, mais on log ici.
                }
            } else {
                console.log(`⚠️ updateTip: Le type de fichier ${file.originalFilename} (${file.headers['content-type']}) n'est pas une image et n'est pas pris en charge pour l'image principale.`);
            }
        }
        
        // Assurez les valeurs par défaut
        fieldsToUpdate.date_modification = new Date().toISOString();
        fieldsToUpdate.imageUrl = newImageUrl; // L'URL de la nouvelle image, ou l'ancienne si pas de nouvelle
        fieldsToUpdate.fileUrls = newFileUrls; // Les URLs des fichiers, y compris la nouvelle image si uploadée
        fieldsToUpdate.urls = fieldsToUpdate.urls || []; // S'assurer que 'urls' est un tableau
        fieldsToUpdate.previewText = fieldsToUpdate.previewText || ""; // Assurer previewText est une chaîne
        fieldsToUpdate.promptText = fieldsToUpdate.promptText || ""; // Assurer promptText est une chaîne
        fieldsToUpdate.chaine = fieldsToUpdate.chaine || "Non spécifié"; // Assurer chaîne est une chaîne
        fieldsToUpdate.outil = fieldsToUpdate.outil || "Non spécifié"; // Assurer outil est une chaîne


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
            fetchedFileSha = fileMetadata.sha;

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
                throw error; // Relaunch the error
            }
        }

        // Trouver le tip à mettre à jour par son ID
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
            ...existingTips[tipIndex], // Garde les champs non modifiés
            ...fieldsToUpdate,         // Applique les nouvelles données
            id: String(id),            // Assure que l'ID reste le même (et en string)
            date_modification: fieldsToUpdate.date_modification // Assure que la date de modification est la dernière
        };
        // Ajoutez le parentFileSha au tip pour qu'il soit récupérable par le frontend
        // lors d'un `get-tips` ultérieur pour une autre édition/suppression.
        existingTips[tipIndex].parentFileSha = fetchedFileSha; 


        const updatedContent = Buffer.from(JSON.stringify(existingTips, null, 2)).toString('base64');
        const commitMessage = `Mise à jour du tip "${fieldsToUpdate.titre || 'Sans titre'}" (ID: ${id})`;

        // Tenter de mettre à jour le fichier JSON sur GitHub avec le SHA récupéré
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: commitMessage,
            content: updatedContent,
            sha: fetchedFileSha, // Utiliser le SHA actuel pour la mise à jour
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
                tip: existingTips[tipIndex], // Retourne l'objet tip mis à jour
                parentFileSha: fetchedFileSha // Retourne le SHA du fichier mis à jour
            }),
        };

    } catch (error) {
        console.error('❌ updateTip: Erreur lors de la mise à jour du tip sur GitHub:', error);
        // Gérer spécifiquement les erreurs de conflit si nécessaire (409)
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
