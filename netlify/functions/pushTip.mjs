// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
// REMOVED: import multiparty from 'multiparty'; // Plus nécessaire car le frontend envoie du JSON pur
// REMOVED: import fs from 'fs/promises';       // Plus nécessaire si tous les uploads de fichiers sont via Cloudinary/uploadMedia.js
// REMOVED: import { Readable } from 'stream';   // Plus nécessaire

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_IMAGE_PATH_CONST = 'assets/images'; // Ces constantes peuvent être obsolètes si toutes les images/docs sont sur Cloudinary
    const GITHUB_TIPS_PATH_CONST = 'data/all-tips.json'; 
    const GITHUB_DOC_PATH_CONST = 'assets/documents'; // Ces constantes peuvent être obsolètes si toutes les images/docs sont sur Cloudinary

    const { 
        GITHUB_TOKEN, 
        GITHUB_OWNER, 
        GITHUB_REPO 
        // Les variables Google Sheet ne sont pas utilisées ici, donc pas besoin de les valider dans ce contexte
    } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.error('❌ pushTip: Variables d\'environnement GitHub critiques manquantes (TOKEN, OWNER, REPO). Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement GitHub critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let newTip = {}; // Initialisation de l'objet qui contiendra les données du tip

    try {
        // NOUVEAU : Parse directement le corps de l'événement en tant que JSON
        const data = JSON.parse(event.body); 
        console.log("📡 pushTip: Données JSON reçues du frontend:", data); // Log pour vérifier le payload

        // Copie toutes les propriétés reçues dans newTip
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
    // Les URLs des médias (imageUrl, fileUrls) sont censées être déjà résolues par uploadMedia.js et présentes dans newTip

    try {
        // --- GESTION DE L'UPLOAD DE FICHIERS (VIA MULTIPARTY) - CETTE LOGIQUE EST MAINTENANT SUPPRIMÉE ---
        // Avant, cette section traitait les fichiers uploadés directement avec le formulaire.
        // Maintenant, l'upload des médias est géré par la fonction `uploadMedia.js`.
        // `newTip.imageUrl` et `newTip.fileUrls` doivent déjà contenir les URLs des médias hébergés (par Cloudinary par exemple).

        // Assurer la présence des champs par défaut et normaliser
        if (!newTip.id) {
            newTip.id = Date.now().toString(); // Génère un nouvel ID si non fourni (mode création)
            newTip.date_creation = new Date().toISOString(); // Date de création
        }
        newTip.date_modification = new Date().toISOString(); // Toujours mettre à jour la date de modification

        newTip.previewText = newTip.previewText || ""; // Valeur par défaut si non fourni
        newTip.promptText = newTip.promptText || ""; // Valeur par défaut si non fourni
        newTip.categorie = newTip.categorie || "Autre"; // Catégorie par défaut
        newTip.outil = newTip.outil || ""; // Valeur par défaut si non fourni
        newTip.urls = newTip.urls || []; // Assure que 'urls' est un tableau
        // newTip.fileUrls est maintenant basé sur ce qui vient du payload ou imageUrl
        newTip.fileUrls = newTip.fileUrls || (newTip.imageUrl ? [newTip.imageUrl] : []); 
        newTip.imageUrl = newTip.imageUrl || null; // Assure imageUrl est null si non fourni

        const jsonFilePath = GITHUB_TIPS_PATH_CONST;

        let existingContent = '';
        let existingSha = null;
        let allTips = [];

        const MAX_RETRIES = 3; // Nombre maximal de tentatives en cas de conflit GitHub
        let retries = 0;
        let commitSuccessful = false;

        // Boucle pour gérer les conflits d'écriture sur GitHub
        while (retries < MAX_RETRIES && !commitSuccessful) {
            try {
                // 1. Récupérer le contenu actuel du fichier JSON des tips depuis GitHub (à chaque tentative)
                const response = await octokit.rest.repos.getContent({
                    owner: GITHUB_OWNER, 
                    repo: GITHUB_REPO,    
                    path: jsonFilePath,
                    branch: 'main',
                });
                existingContent = Buffer.from(response.data.content, 'base64').toString('utf8');
                existingSha = response.data.sha; // SHA actuel du fichier
                console.log(`💾 pushTip (Tentative ${retries + 1}): Fichier JSON existant récupéré. SHA: ${existingSha}`);
            } catch (e) {
                if (e.status === 404) {
                    console.log("💾 pushTip: Le fichier JSON des tips n'existe pas encore, il sera créé.");
                    existingContent = ''; // Le fichier n'existe pas, on part d'un contenu vide
                    existingSha = null; // Le SHA est null pour une nouvelle création
                } else {
                    console.error("❌ pushTip: Erreur lors de la récupération du fichier JSON existant:", e);
                    throw e; // Relaunch l'erreur si ce n'est pas un 404
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

            // Trouver et mettre à jour le tip si l'ID existe déjà (utile pour les retries en cas de conflit)
            const tipIndex = allTips.findIndex(tip => String(tip.id) === String(newTip.id));
            if (tipIndex !== -1) {
                // Fusionne les données existantes avec les nouvelles pour une mise à jour douce
                allTips[tipIndex] = { ...allTips[tipIndex], ...newTip }; 
                console.log(`⚠️ pushTip: Le tip avec l'ID ${newTip.id} existe déjà dans le tableau. Mise à jour des données.`);
            } else {
                allTips.push(newTip); // Ajoute le nouveau tip
            }

            const updatedContent = JSON.stringify(allTips, null, 2);
            const commitMessage = `Ajout du tip "${newTip.titre || 'Sans titre'}" par ${newTip.auteur || 'Inconnu'}`;

            // 2. Tenter de mettre à jour le fichier JSON sur GitHub avec le SHA actuel
            try {
                await octokit.rest.repos.createOrUpdateFileContents({
                    owner: GITHUB_OWNER, 
                    repo: GITHUB_REPO,    
                    path: jsonFilePath,
                    message: commitMessage,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: existingSha, // Le SHA récupéré au début de cette tentative
                    branch: 'main',
                });
                console.log("✅ pushTip: Fichier JSON des tips mis à jour sur GitHub.");
                commitSuccessful = true; // La modification a réussi, sortir de la boucle
            } catch (error) {
                if (error.status === 409 && retries < MAX_RETRIES - 1) {
                    console.warn(`⚠️ pushTip: Conflit de version détecté pour ${jsonFilePath}. Tentative ${retries + 1}/${MAX_RETRIES}. Récupération du SHA le plus récent pour re-tenter.`);
                    retries++;
                    // La boucle `while` va se répéter et tenter de nouveau avec le SHA le plus récent
                } else {
                    throw error; // Relaunch toutes les autres erreurs (non-409 ou tentatives épuisées)
                }
            }
        }

        if (!commitSuccessful) {
            console.error('❌ pushTip: Échec de la mise à jour du fichier JSON après plusieurs tentatives en raison de conflits persistants.');
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Échec de la mise à jour du tip en raison de conflits persistants.' }),
            };
        }

        // Retourne la structure du tip final pour la confirmation côté client
        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Autorise toutes les origines pour le développement
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                message: 'Tip ajouté avec succès !',
                tip: { // Retourne l'objet tip complet tel qu'il a été sauvegardé
                    ...newTip,
                    parentFileSha: existingSha // Inclure le SHA du fichier principal ici pour le mode édition/suppression futur
                } 
            }),
        };

    } catch (error) { // Ce bloc catch gère toutes les erreurs générales non spécifiques aux conflits de GitHub
        console.error('❌ pushTip: Erreur inattendue ou critique lors du traitement:', error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message || error}` }),
        };
    }
}
