// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TIPS_PATH_CONST = 'data/all-tips.json'; 

    const { 
        GITHUB_TOKEN, 
        GITHUB_OWNER, 
        GITHUB_REPO 
    } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.error('❌ pushTip: Variables d\'environnement GitHub critiques manquantes (TOKEN, OWNER, REPO). Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement GitHub critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let newTip = {};

    try {
        const data = JSON.parse(event.body); 
        console.log("📡 pushTip: Données JSON reçues du frontend:", data);

        // Copie toutes les propriétés reçues, y compris imageUrl et videoThumbnailUrl
        newTip = { ...data };

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du corps de la requête JSON:', e);
        return { 
            statusCode: 400, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Format de requête invalide: ${e.message || 'Le corps doit être un JSON valide.'}` }) 
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Assurer la présence des champs par défaut et normaliser
        if (!newTip.id) {
            newTip.id = Date.now().toString(); 
            newTip.date_creation = new Date().toISOString(); 
        }
        newTip.date_modification = new Date().toISOString();
        newTip.previewText = newTip.previewText || "";
        newTip.promptText = newTip.promptText || "";
        newTip.categorie = newTip.categorie || "Autre"; 
        newTip.outil = newTip.outil || "";
        newTip.urls = newTip.urls || []; 
        
        // --- NOUVEAU : GESTION DE imageUrl et videoThumbnailUrl ---
        newTip.imageUrl = newTip.imageUrl || null; // L'URL principale (vidéo ou image)
        newTip.videoThumbnailUrl = newTip.videoThumbnailUrl || null; // L'URL de la miniature (pour les vidéos)
        // fileUrls est maintenant dérivé de imageUrl ou de videoThumbnailUrl si imageUrl est une vidéo
        newTip.fileUrls = newTip.fileUrls || []; 
        if (newTip.imageUrl && newTip.fileUrls.length === 0) {
            newTip.fileUrls.push(newTip.imageUrl);
        }
        if (newTip.videoThumbnailUrl && !newTip.fileUrls.includes(newTip.videoThumbnailUrl)) {
            // Optionnel: ajouter la miniature aux fileUrls si vous voulez qu'elle soit dans cette liste générique
            // newTip.fileUrls.push(newTip.videoThumbnailUrl); 
        }
        // --- FIN NOUVEAU ---

        const jsonFilePath = GITHUB_TIPS_PATH_CONST;

        let existingContent = '';
        let existingSha = null;
        let allTips = [];

        const MAX_RETRIES = 3; 
        let retries = 0;
        let commitSuccessful = false;

        while (retries < MAX_RETRIES && !commitSuccessful) {
            try {
                const response = await octokit.rest.repos.getContent({
                    owner: GITHUB_OWNER, 
                    repo: GITHUB_REPO,    
                    path: jsonFilePath,
                    branch: 'main',
                });
                existingContent = Buffer.from(response.data.content, 'base64').toString('utf8');
                existingSha = response.data.sha;
                console.log(`💾 pushTip (Tentative ${retries + 1}): Fichier JSON existant récupéré. SHA: ${existingSha}`);
            } catch (e) {
                if (e.status === 404) {
                    console.log("💾 pushTip: Le fichier JSON des tips n'existe pas encore, il sera créé.");
                    existingContent = ''; 
                    existingSha = null; 
                } else {
                    console.error("❌ pushTip: Erreur lors de la récupération du fichier JSON existant:", e);
                    throw e; 
                }
            }

            allTips = [];
            if (existingContent) {
                try {
                    allTips = JSON.parse(existingContent);
                    if (!Array.isArray(allTips)) {
                        console.warn("💾 pushTip: Le contenu JSON existant n'est pas un tableau. Il sera initialisé comme un nouveau tableau.");
                        allTips = [];
                    }
                } catch (jsonParseError) {
                    console.error("❌ pushTip: Erreur de parsing du JSON existant. Le fichier sera initialisé.", jsonParseError);
                    allTips = [];
                }
            }

            const tipIndex = allTips.findIndex(tip => String(tip.id) === String(newTip.id));
            if (tipIndex !== -1) {
                allTips[tipIndex] = { ...allTips[tipIndex], ...newTip }; 
                console.log(`⚠️ pushTip: Le tip avec l'ID ${newTip.id} existe déjà. Mise à jour des données.`);
            } else {
                allTips.push(newTip); 
            }

            const updatedContent = JSON.stringify(allTips, null, 2);
            const commitMessage = `Ajout du tip "${newTip.titre || 'Sans titre'}" par ${newTip.auteur || 'Inconnu'}`;

            try {
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
                    console.warn(`⚠️ pushTip: Conflit de version détecté pour ${jsonFilePath}. Tentative ${retries + 1}/${MAX_RETRIES}. Récupération du SHA le plus récent pour re-tenter.`);
                    retries++;
                } else {
                    throw error; 
                }
            }
        }

        if (!commitSuccessful) {
            console.error('❌ pushTip: Échec de la mise à jour du fichier JSON après plusieurs tentatives en raison de conflits persistants.');
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Échec de la mise à jour du tip en raison de conflits répétés.' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                message: 'Tip ajouté avec succès !',
                tip: { 
                    ...newTip,
                    parentFileSha: existingSha 
                } 
            }),
        };

    } catch (error) {
        console.error('❌ pushTip: Erreur finale lors du traitement ou de l\'interaction GitHub:', error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message || error}` }),
        };
    }
}
