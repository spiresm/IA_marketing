// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
// Pas besoin de 'multiparty' ou 'fs/promises' si vous traitez le corps de l'événement directement ou utilisez parse-multipart
// parse-multipart est souvent intégré dans l'environnement Netlify Functions pour gérer les payloads multipart
import { parse as parseMultipart } from 'parse-multipart';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_IMAGE_PATH_CONST = 'assets/images';
    const GITHUB_TIPS_PATH_CONST = 'data/all-tips.json';
    const GITHUB_DOC_PATH_CONST = 'assets/documents';

    const {
        GITHUB_TOKEN,
        GITHUB_OWNER,
        GITHUB_REPO
    } = process.env;

    // --- Validation des variables d'environnement ---
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.error('❌ pushTip: Variables d\'environnement GitHub critiques manquantes. Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let incomingTipData = {};
    let uploadedFileParts = []; // Pour stocker les parties de fichiers du formulaire

    try {
        const contentType = event.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Content-Type must be multipart/form-data.' }) };
        }

        const boundary = parseMultipart.getBoundary(contentType);
        const parts = parseMultipart(Buffer.from(event.body, 'base64'), boundary);

        for (const part of parts) {
            if (part.filename) {
                uploadedFileParts.push(part); // C'est une partie fichier
            } else {
                incomingTipData[part.name] = part.data.toString('utf8'); // C'est une partie champ
            }
        }

        if (!incomingTipData.auteur || !incomingTipData.titre || !incomingTipData.description) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Champs obligatoires (auteur, titre, description) manquants.' }) };
        }

        if (uploadedFileParts.length > 0) {
            console.log(`📡 pushTip: ${uploadedFileParts.length} fichier(s) détecté(s) pour traitement.`);
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data:', e);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: `Erreur lors du traitement du formulaire: ${e.message || e}` })
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedFileUrls = [];

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGES ET DE DOCUMENTS ---
        for (const filePart of uploadedFileParts) {
            const mimeType = filePart.type; // Le type MIME est dans 'part.type' avec parse-multipart
            if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') {
                console.log(`📡 pushTip: Traitement du fichier: ${filePart.filename} (${mimeType})`);

                // Générer un nom de fichier unique et sûr sans 'uuid'
                const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${filePart.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

                let filePathInRepo;
                let fileBaseUrl;
                if (mimeType.startsWith('image/')) {
                    filePathInRepo = `${GITHUB_IMAGE_PATH_CONST}/${uniqueFileName}`;
                    fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH_CONST}`;
                } else {
                    filePathInRepo = `${GITHUB_DOC_PATH_CONST}/${uniqueFileName}`;
                    fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_DOC_PATH_CONST}`;
                }

                try {
                    await octokit.rest.repos.createOrUpdateFileContents({
                        owner: GITHUB_OWNER,
                        repo: GITHUB_REPO,
                        path: filePathInRepo,
                        message: `Add file ${filePart.filename} for tip: ${incomingTipData.titre || 'Untitled'}`,
                        content: filePart.data.toString('base64'), // Le contenu est directement dans part.data
                        branch: 'main',
                    });
                    const currentFileUrl = `${fileBaseUrl}/${uniqueFileName}`;
                    uploadedFileUrls.push(currentFileUrl);
                    console.log(`✅ pushTip: Fichier uploadé avec succès: ${currentFileUrl}`);
                } catch (fileUploadError) {
                    console.error(`❌ pushTip: Erreur lors de l'upload du fichier ${filePart.filename} à GitHub:`, fileUploadError);
                }
            } else {
                console.log(`⚠️ pushTip: Fichier non-pris en charge ignoré: ${filePart.filename} (${mimeType})`);
            }
        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES/DOCUMENTS ---

        // --- DÉBUT : GESTION DU FICHIER JSON DES TIPS ---
        const jsonFilePath = GITHUB_TIPS_PATH_CONST;
        const MAX_RETRIES = 5;
        let retries = 0;
        let commitSuccessful = false;
        let finalTipData = null;

        while (retries < MAX_RETRIES && !commitSuccessful) {
            try {
                let existingContent = '[]'; // Default to empty array for new file
                let existingSha = null;
                let allTips = [];

                // 1. Récupérer le contenu actuel du fichier JSON des tips
                try {
                    const { data } = await octokit.rest.repos.getContent({
                        owner: GITHUB_OWNER,
                        repo: GITHUB_REPO,
                        path: jsonFilePath,
                        branch: 'main',
                    });
                    existingContent = Buffer.from(data.content, 'base64').toString('utf8');
                    existingSha = data.sha;
                    console.log(`💾 pushTip (Tentative ${retries + 1}): Fichier JSON existant récupéré. SHA: ${existingSha}`);
                } catch (e) {
                    if (e.status === 404) {
                        console.log("💾 pushTip: Le fichier JSON des tips n'existe pas encore, il sera créé.");
                    } else {
                        console.error("❌ pushTip: Erreur lors de la récupération du fichier JSON existant:", e);
                        throw e;
                    }
                }

                try {
                    allTips = JSON.parse(existingContent);
                    if (!Array.isArray(allTips)) {
                        console.warn("💾 pushTip: Le contenu JSON existant n'est pas un tableau. Il sera réinitialisé.");
                        allTips = [];
                    }
                } catch (jsonParseError) {
                    console.error("❌ pushTip: Erreur de parsing du JSON existant. Le fichier sera initialisé.", jsonParseError);
                    allTips = [];
                }

                const now = new Date().toISOString();

                // Rechercher si le tip existe déjà par son ID (si envoyé par le frontend)
                // Pour le formulaire "Partager un Tip", incomingTipData.id sera vide.
                let tipIndex = -1;
                if (incomingTipData.id) {
                    tipIndex = allTips.findIndex(tip => tip.id === incomingTipData.id);
                }

                if (tipIndex !== -1) {
                    // C'est une MISE À JOUR d'un tip existant
                    const existingTip = allTips[tipIndex];
                    console.log(`🔄 pushTip: Mise à jour du tip existant avec ID: ${existingTip.id}`);

                    // Mettre à jour les propriétés du tip existant, MAIS PRÉSERVER la date_creation
                    finalTipData = {
                        ...existingTip, // Garde toutes les propriétés existantes
                        auteur: incomingTipData.auteur || existingTip.auteur,
                        titre: incomingTipData.titre || existingTip.titre,
                        description: incomingTipData.description || existingTip.description,
                        previewText: incomingTipData.previewText !== undefined ? incomingTipData.previewText : (existingTip.previewText || ''),
                        promptText: incomingTipData.promptText !== undefined ? incomingTipData.promptText : (existingTip.promptText || ''),
                        categorie: incomingTipData.categorie || existingTip.categorie || 'Autre',
                        outil: incomingTipData.outil || existingTip.outil || '',
                        date_modification: now, // Met à jour la date de modification
                        fileUrls: uploadedFileUrls.length > 0 ? uploadedFileUrls : (existingTip.fileUrls || []), // Met à jour les URLs de fichiers
                        // date_creation est implicitement conservée car non écrasée ici
                    };
                    allTips[tipIndex] = finalTipData; // Remplace le tip dans le tableau
                } else {
                    // C'est une NOUVELLE CRÉATION de tip
                    console.log('✨ pushTip: Création d\'un nouveau tip.');
                    finalTipData = {
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // ID simple unique
                        auteur: incomingTipData.auteur || 'Inconnu',
                        titre: incomingTipData.titre,
                        description: incomingTipData.description,
                        previewText: incomingTipData.previewText || '',
                        promptText: incomingTipData.promptText || '',
                        categorie: incomingTipData.categorie || 'Autre',
                        outil: incomingTipData.outil || '',
                        date_creation: now, // Date de création fixée ici à la première création
                        date_modification: now, // Date de modification initiale (même que création)
                        fileUrls: uploadedFileUrls
                    };
                    allTips.push(finalTipData); // Ajoute le nouveau tip
                }

                const updatedContent = JSON.stringify(allTips, null, 2);
                const commitMessage = `feat: ${tipIndex !== -1 ? 'Update' : 'Add'} tip "${finalTipData.titre}" by ${finalTipData.auteur}`;

                await octokit.rest.repos.createOrUpdateFileContents({
                    owner: GITHUB_OWNER,
                    repo: GITHUB_REPO,
                    path: jsonFilePath,
                    message: commitMessage,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: existingSha,
                    branch: 'main',
                });
                console.log("✅ pushTip: Fichier JSON des tips mis à jour sur GitHub.");
                commitSuccessful = true;

            } catch (error) {
                if (error.status === 409 && retries < MAX_RETRIES - 1) {
                    console.warn(`⚠️ pushTip: Conflit de version détecté pour ${jsonFilePath}. Tentative ${retries + 1}/${MAX_RETRIES}. Récupération du SHA le plus récent...`);
                    retries++;
                } else {
                    console.error('❌ pushTip: Erreur critique lors de l\'ajout/mise à jour du tip:', error);
                    return {
                        statusCode: error.status || 500,
                        body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message || error}` }),
                    };
                }
            }
        }

        if (!commitSuccessful) {
            console.error('❌ pushTip: Échec de la mise à jour du fichier JSON après plusieurs tentatives en raison de conflits.');
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Échec de la mise à jour du tip en raison de conflits répétés.' }),
            };
        }

        // --- FIN : GESTION DU FICHIER JSON DES TIPS ---

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Tip ajouté/mis à jour avec succès !',
                tip: finalTipData,
                imageUrls: finalTipData.fileUrls
            }),
        };

    } catch (error) {
        console.error('❌ pushTip: Erreur générale inattendue:', error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message || error}` }),
        };
    }
}
