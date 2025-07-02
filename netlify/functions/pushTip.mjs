// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty';
import fs from 'fs/promises';
import { Readable } from 'stream';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_IMAGE_PATH_CONST = 'assets/images';
    const GITHUB_TIPS_PATH_CONST = 'data/all-tips.json'; // IMPORTANT : Assurez-vous que c'est bien 'all-tips.json' comme discuté
    const GITHUB_DOC_PATH_CONST = 'assets/documents';

    const { 
        GITHUB_TOKEN, 
        GITHUB_OWNER, 
        GITHUB_REPO, 
        GOOGLE_SHEET_ID_TIPS, // Not directly used in this GitHub-based function
        GOOGLE_SERVICE_ACCOUNT_EMAIL, // Not directly used in this GitHub-based function
        GOOGLE_PRIVATE_KEY // Not directly used in this GitHub-based function
    } = process.env;

    // Ajustement de la vérification des variables d'environnement si vous ne les utilisez pas toutes ici
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.error('❌ pushTip: Variables d\'environnement GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO manquantes. Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement GitHub critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields = {}; // Initialisation pour éviter ReferenceError si multiparty.Form() échoue
    let files = {};
    let newTip = {};

    const requestStream = new Readable();
    requestStream.push(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8'));
    requestStream.push(null);
    requestStream.headers = event.headers;
    requestStream.method = event.httpMethod;

    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            form.parse(requestStream, (err, fieldsResult, filesResult) => { // Renommé pour éviter conflit avec let fields;
                if (err) {
                    console.error('❌ pushTip: Erreur de parsing du formulaire:', err);
                    return reject(err);
                }
                resolve({ fields: fieldsResult, files: filesResult });
            });
        });

        fields = parsedFields;
        files = parsedFiles;

        // --- DÉBUT DE LA CORRECTION : PARSING DES CHAMPS, Y COMPRIS 'urls' ---
        for (const key in fields) {
            if (fields[key] && fields[key].length > 0) {
                if (key === 'urls') {
                    try {
                        // C'EST LA LIGNE CRUCIALE : parse la chaîne JSON en un tableau JavaScript
                        newTip[key] = JSON.parse(fields[key][0]);
                    } catch (e) {
                        console.error(`❌ pushTip: Erreur de parsing du champ 'urls': ${fields[key][0]}`, e);
                        newTip[key] = []; // Assurez-vous que c'est un tableau vide en cas d'erreur
                    }
                } else {
                    newTip[key] = fields[key][0];
                }
            }
        }
        // --- FIN DE LA CORRECTION : PARSING DES CHAMPS ---

        if (files && files.files && files.files.length > 0) {
            console.log("📡 pushTip: Fichier(s) détecté(s) pour traitement.");
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data ou du body stream:', e);
        let errorMessage = 'Erreur lors du traitement des données uploadées.';
        if (e.message && e.message.includes('Unexpected end of form')) {
            errorMessage = 'Le fichier uploadé est peut-être corrompu ou incomplet.';
        } else if (e.message) {
            errorMessage = `Erreur de parsing: ${e.message}`;
        }
        return { 
            statusCode: 400, 
            body: JSON.stringify({ message: errorMessage }) 
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedImageUrl = null;
    let uploadedImageUrls = []; // Pour stocker toutes les URLs des fichiers uploadés

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGES ET DE DOCUMENTS ---
        // Cette section gère l'upload de fichiers joints (via l'input 'files')
        if (files && files.files && files.files.length > 0) {
            console.log(`📡 pushTip: ${files.files.length} fichiers trouvés, tentative d'upload sur GitHub...`);
            for (const file of files.files) {
                const mimeType = file.headers['content-type'];
                // Assurez-vous que le fichier est réellement un fichier avec un chemin temporaire
                if (!file.path) {
                    console.warn(`⚠️ pushTip: Fichier temporaire non trouvé pour ${file.originalFilename}. Ignoré.`);
                    continue;
                }

                if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') { 
                    console.log(`📡 pushTip: Traitement du fichier: ${file.originalFilename} (${mimeType})`);
                    const fileBuffer = await fs.readFile(file.path);
                    const base64Data = fileBuffer.toString('base64');

                    // Nettoyer le nom de fichier pour l'URL
                    const safeFileName = file.originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const uniqueFileName = `${Date.now()}-${safeFileName}`;
                    
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
                            message: `Ajout du fichier ${file.originalFilename} pour le tip: ${newTip.titre || 'Sans titre'}`,
                            content: base64Data,
                            branch: 'main',
                        });
                        const currentFileUrl = `${fileBaseUrl}/${uniqueFileName}`;
                        uploadedImageUrls.push(currentFileUrl);
                        console.log(`✅ pushTip: Fichier uploadé avec succès: ${currentFileUrl}`);
                    } catch (fileUploadError) {
                        console.error(`❌ pushTip: Erreur lors de l'upload du fichier ${file.originalFilename} à GitHub:`, fileUploadError);
                        // Ne pas bloquer l'exécution si un seul fichier échoue
                    }
                } else {
                    console.log(`⚠️ pushTip: Fichier non-pris en charge ignoré: ${file.originalFilename} (${mimeType})`);
                }
            }
            newTip.fileUrls = uploadedImageUrls;
            // Pour l'image principale, si aucune n'est explicitement définie, utilisez la première des filesUploads
            newTip.imageUrl = newTip.imageUrl || (uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null);

        } else {
            // Si pas de fichiers uploadés, mais que imageUrl est envoyé via un champ de formulaire (par exemple, pour conserver une image existante sans la re-uploader)
            // Assurez-vous que imageUrl est bien dans newTip si elle a été envoyée
            newTip.imageUrl = newTip.imageUrl || null;
            newTip.fileUrls = newTip.fileUrls || (newTip.imageUrl ? [newTip.imageUrl] : []);
        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES/DOCUMENTS ---


        const jsonFilePath = GITHUB_TIPS_PATH_CONST;

        let existingContent = '';
        let existingSha = null;
        let allTips = [];

        // AJOUT : Variable pour le nombre de tentatives en cas de conflit
        const MAX_RETRIES = 3;
        let retries = 0;
        let commitSuccessful = false;

        while (retries < MAX_RETRIES && !commitSuccessful) {
            try {
                // 1. Récupérer le contenu actuel du fichier JSON des tips (à chaque tentative)
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
                        existingContent = ''; // S'assurer que le contenu est vide pour une nouvelle création
                        existingSha = null; // S'assurer que le SHA est null pour une nouvelle création
                    } else {
                        console.error("❌ pushTip: Erreur lors de la récupération du fichier JSON existant:", e);
                        throw e; // Relaunch the error
                    }
                }

                allTips = [];
                if (existingContent) {
                    try {
                        allTips = JSON.parse(existingContent);
                        if (!Array.isArray(allTips)) {
                            console.warn("💾 pushTip: Le contenu JSON existant n'est pas un tableau. Il sera écrasé.");
                            allTips = [];
                        }
                    } catch (jsonParseError) {
                        console.error("❌ pushTip: Erreur de parsing du JSON existant. Le fichier sera initialisé.", jsonParseError);
                        allTips = [];
                    }
                }

                // Assurez-vous d'ajouter le nouveau tip à la version la plus récente des tips
                // Si l'ID n'existe pas encore, le créer.
                if (!newTip.id) {
                    newTip.id = Date.now().toString();
                    newTip.date_creation = new Date().toISOString();
                }
                newTip.date_modification = new Date().toISOString(); // Toujours mettre à jour la date de modification

                // Assurer des valeurs par défaut pour les champs non envoyés ou vides
                newTip.previewText = newTip.previewText || "";
                newTip.promptText = newTip.promptText || "";
                newTip.categorie = newTip.categorie || "Autre"; // Catégorie par défaut
                newTip.outil = newTip.outil || "";
                newTip.urls = newTip.urls || []; // S'assurer que 'urls' est un tableau
                newTip.fileUrls = newTip.fileUrls || []; // S'assurer que 'fileUrls' est un tableau


                // Trouver et remplacer le tip si l'ID existe (pour les retries ou si la fonction était réutilisée)
                const tipIndex = allTips.findIndex(tip => tip.id === newTip.id);
                if (tipIndex !== -1) {
                    allTips[tipIndex] = { ...allTips[tipIndex], ...newTip }; // Fusionne les données existantes avec les nouvelles
                    console.log(`⚠️ pushTip: Le tip avec l'ID ${newTip.id} existe déjà dans le tableau récupéré. Mise à jour des données existantes.`);
                } else {
                    allTips.push(newTip);
                }


                const updatedContent = JSON.stringify(allTips, null, 2);
                const commitMessage = `Ajout du tip "${newTip.titre || 'Sans titre'}" par ${newTip.auteur || 'Inconnu'}`;

                // 2. Tenter de mettre à jour le fichier JSON avec le SHA actuel
                await octokit.rest.repos.createOrUpdateFileContents({
                    owner: GITHUB_OWNER, 
                    repo: GITHUB_REPO,    
                    path: jsonFilePath,
                    message: commitMessage,
                    content: Buffer.from(updatedContent).toString('base64'),
                    sha: existingSha, // Le SHA récupéré à la début de cette tentative
                    branch: 'main',
                });
                console.log("✅ pushTip: Fichier JSON des tips mis à jour sur GitHub.");
                commitSuccessful = true; // Succès, sortir de la boucle

            } catch (error) {
                if (error.status === 409 && retries < MAX_RETRIES - 1) {
                    console.warn(`⚠️ pushTip: Conflit de version détecté pour ${jsonFilePath}. Tentative ${retries + 1}/${MAX_RETRIES}. Récupération du SHA le plus récent...`);
                    retries++;
                    // Le `while` loop va re-tenter avec le nouveau SHA
                } else {
                    console.error('❌ pushTip: Erreur critique lors de l\'ajout du tip à GitHub:', error);
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

        // Retourne la structure du tip final pour la confirmation côté client
        return {
            statusCode: 200,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Autorise toutes les origines pour le développement
                "Access-Control-Allow-Methods": "POST, OPTIONS", // Ajoutez OPTIONS pour le preflight
                "Access-Control-Allow-Headers": "Content-Type", // Ajoutez les headers autorisés
            },
            body: JSON.stringify({
                message: 'Tip ajouté avec succès !',
                tip: { // Retourne l'objet tip complet tel qu'il a été sauvegardé
                    ...newTip,
                    // Inclure le SHA du fichier principal ici pour le mode édition futur
                    parentFileSha: existingSha 
                } 
            }),
        };

    } catch (error) { // Ce bloc catch gère les erreurs qui ne sont PAS des conflits 409 ou celles avant la boucle de retry
        console.error('❌ pushTip: Erreur inattendue:', error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message || error}` }),
        };
    }
}
