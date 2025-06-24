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
        GOOGLE_SHEET_ID_TIPS,
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY
    } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || 
        !GOOGLE_SHEET_ID_TIPS || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('❌ pushTip: Variables d\'environnement critiques manquantes. Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields;
    let files;
    let newTip = {};

    const requestStream = new Readable();
    requestStream.push(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8'));
    requestStream.push(null);
    requestStream.headers = event.headers;
    requestStream.method = event.httpMethod;

    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            form.parse(requestStream, (err, fields, files) => {
                if (err) {
                    console.error('❌ pushTip: Erreur de parsing du formulaire:', err);
                    return reject(err);
                }
                resolve({ fields, files });
            });
        });

        fields = parsedFields;
        files = parsedFiles;

        for (const key in fields) {
            if (fields[key] && fields[key].length > 0) {
                newTip[key] = fields[key][0];
            }
        }

        if (files && files.files && files.files.length > 0) {
            console.log("📡 pushTip: Fichier(s) détecté(s) pour traitement.");
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data:', e);
        let errorMessage = 'Erreur lors du traitement des fichiers uploadés.';
        if (e.message && e.message.includes('Unexpected end of form')) {
            errorMessage = 'Le fichier est peut-être corrompu ou incomplet.';
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
    let uploadedImageUrls = [];

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGES ET DE DOCUMENTS ---
        if (files && files.files && files.files.length > 0) {
            console.log(`📡 pushTip: ${files.files.length} fichiers trouvés, tentative d'upload sur GitHub...`);
            for (const file of files.files) {
                const mimeType = file.headers['content-type'];
                if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') { 
                    console.log(`📡 pushTip: Traitement du fichier: ${file.originalFilename} (${mimeType})`);
                    const fileBuffer = await fs.readFile(file.path);
                    const base64Data = fileBuffer.toString('base64');

                    const uniqueFileName = `${Date.now()}-${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
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
                        const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
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
            uploadedImageUrl = uploadedImageUrls.length > 0 && uploadedImageUrls[0].startsWith(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH_CONST}`) ? uploadedImageUrls[0] : null;

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
                // Si c'est une re-tentative, le tip pourrait déjà être là si on n'est pas attentif.
                // Une meilleure approche serait de passer newTip à chaque itération.
                // Pour l'instant, on part du principe que newTip est unique à chaque soumission.
                // Si `newTip.id` est un Date.now(), il sera toujours unique pour cette tentative.
                // Vérifions si le tip avec le même ID existe déjà (utile si l'ID est généré une seule fois au début)
                if (!newTip.id) {
                    newTip.id = Date.now().toString();
                    newTip.date_creation = new Date().toISOString();
                    newTip.date_modification = new Date().toISOString();
                    if (!newTip.previewText) newTip.previewText = "";
                    if (!newTip.promptText) newTip.promptText = "";
                    if (!newTip.categorie) newTip.categorie = "Autre";
                    if (!newTip.outil) newTip.outil = "";
                }

                const tipExists = allTips.some(tip => tip.id === newTip.id);
                if (!tipExists) {
                    allTips.push(newTip);
                } else {
                    console.log(`⚠️ pushTip: Le tip avec l'ID ${newTip.id} existe déjà dans le tableau récupéré. Mise à jour ou Ignorance de l'ajout.`);
                    // Optionnel: Si l'ID est le même, vous pourriez vouloir mettre à jour le tip existant au lieu d'en ajouter un nouveau.
                    // Pour l'instant, on laisse tel quel pour s'assurer que le push se fasse.
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

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Tip ajouté avec succès !',
                tip: newTip,
                imageUrl: uploadedImageUrl,
                imageUrls: newTip.fileUrls
            }),
        };

    } catch (error) { // Ce bloc catch gère les erreurs qui ne sont PAS des conflits 409
        console.error('❌ pushTip: Erreur inattendue avant la gestion des conflits ou après les retries:', error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message || error}` }),
        };
    }
}
