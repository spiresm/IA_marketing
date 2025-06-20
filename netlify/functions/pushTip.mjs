// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty';
import fs from 'fs/promises';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // Assurez-vous que ces variables d'environnement sont définies dans Netlify
    // CORRECTION CLÉ ICI : Utilisation des noms exacts des variables d'environnement de Netlify
    const { 
        GITHUB_TOKEN, 
        GITHUB_OWNER,       // Correspond à 'GITHUB_OWNER' dans Netlify
        GITHUB_REPO,        // Correspond à 'GITHUB_REPO' dans Netlify
        GITHUB_IMAGE_PATH,  // Correspond à 'GITHUB_IMAGE_PATH' dans Netlify
        GITHUB_TIPS_PATH,   // Correspond à 'GITHUB_TIPS_PATH' dans Netlify
        // GITHUB_PROFIL_PATH n'est pas utilisé dans cette fonction, donc retiré de la déstructuration ici.
        // Si d'autres fonctions l'utilisent, il sera défini et vérifié là-bas.

        // Ajout de variables Google Sheets si votre fonction interagit avec :
        GOOGLE_SHEET_ID_TIPS,
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY
    } = process.env;

    // Vérification des variables d'environnement critiques
    // Adaptez cette liste si toutes les variables Google Sheets ne sont pas toujours nécessaires pour pushTip
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_IMAGE_PATH || !GITHUB_TIPS_PATH || 
        !GOOGLE_SHEET_ID_TIPS || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('❌ pushTip: Variables d\'environnement manquantes. Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement critiques manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields;
    let files;
    let newTip = {};
    let firstImageFile = null; // Cette variable n'est pas utilisée après le parsing initial.

    // Gérer l'encodage base64 de l'event.body pour multiparty
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);

    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            // Passer le Buffer au lieu de l'event.body brut
            form.parse(bodyBuffer, (err, fields, files) => {
                if (err) {
                    console.error('❌ pushTip: Erreur de parsing du formulaire:', err);
                    return reject(err);
                }
                resolve({ fields, files });
            });
        });

        fields = parsedFields;
        files = parsedFiles;

        // Mapper les champs du formulaire vers newTip
        for (const key in fields) {
            if (fields[key] && fields[key].length > 0) {
                newTip[key] = fields[key][0]; // Prend la première valeur pour chaque champ
            }
        }

        if (files && files.files && files.files.length > 0) {
            console.log("📡 pushTip: Fichier(s) détecté(s) pour traitement.");
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data:', e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Attendu multipart/form-data.' }) };
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
                // Inclure les types MIME spécifiques que vous souhaitez gérer
                if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') { 
                    console.log(`📡 pushTip: Traitement du fichier: ${file.originalFilename} (${mimeType})`);
                    const fileBuffer = await fs.promises.readFile(file.path); // Lire le fichier depuis le chemin temporaire
                    const base64Data = fileBuffer.toString('base64');

                    const uniqueFileName = `${Date.now()}-${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    let filePathInRepo;
                    let fileBaseUrl;
                    if (mimeType.startsWith('image/')) {
                        filePathInRepo = `${GITHUB_IMAGE_PATH}/${uniqueFileName}`;
                        // Utilise GITHUB_OWNER et GITHUB_REPO pour la construction de l'URL brute
                        fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH}`; 
                    } else { // Documents (txt, pdf)
                        // Utilisez une variable d'environnement si le chemin des documents est dynamique
                        // Sinon, 'assets/documents' sera le chemin par défaut.
                        const GITHUB_DOC_PATH = process.env.GITHUB_DOC_PATH || 'assets/documents'; 
                        filePathInRepo = `${GITHUB_DOC_PATH}/${uniqueFileName}`;
                        // Utilise GITHUB_OWNER et GITHUB_REPO pour la construction de l'URL brute
                        fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_DOC_PATH}`;
                    }

                    try {
                        const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
                            owner: GITHUB_OWNER, // CORRIGÉ
                            repo: GITHUB_REPO,   // CORRIGÉ
                            path: filePathInRepo,
                            message: `Ajout du fichier ${file.originalFilename} pour le tip: ${newTip.titre || 'Sans titre'}`,
                            content: base64Data,
                            branch: 'main',
                        });
                        const currentFileUrl = `${fileBaseUrl}/${uniqueFileName}`;
                        uploadedImageUrls.push(currentFileUrl); // Stocke toutes les URLs de fichiers (images et documents)
                        console.log(`✅ pushTip: Fichier uploadé avec succès: ${currentFileUrl}`);
                    } catch (fileUploadError) {
                        console.error(`❌ pushTip: Erreur lors de l'upload du fichier ${file.originalFilename} à GitHub:`, fileUploadError);
                        // Ne pas bloquer l'exécution si un seul fichier échoue
                    }
                } else {
                    console.log(`⚠️ pushTip: Fichier non-pris en charge ignoré: ${file.originalFilename} (${mimeType})`);
                }
            }
            newTip.fileUrls = uploadedImageUrls; // Attache toutes les URLs à l'objet du nouveau tip
            // Définir uploadedImageUrl comme la première image si elle existe
            uploadedImageUrl = uploadedImageUrls.length > 0 && uploadedImageUrls[0].startsWith(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH}`) ? uploadedImageUrls[0] : null;

        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES/DOCUMENTS ---


        // --- DÉBUT : GESTION DU FICHIER JSON DES TIPS ---
        const jsonFilePath = GITHUB_TIPS_PATH; // Chemin du fichier JSON, tiré des variables d'environnement

        let existingContent = '';
        let existingSha = null;

        try {
            // Récupérer le contenu actuel du fichier JSON des tips
            const { data } = await octokit.rest.repos.getContent({
                owner: GITHUB_OWNER, // CORRIGÉ
                repo: GITHUB_REPO,   // CORRIGÉ
                path: jsonFilePath,
                branch: 'main',
            });
            existingContent = Buffer.from(data.content, 'base64').toString('utf8');
            existingSha = data.sha;
            console.log("💾 pushTip: Fichier JSON existant récupéré. SHA:", existingSha);
        } catch (e) {
            if (e.status === 404) {
                console.log("💾 pushTip: Le fichier JSON des tips n'existe pas encore, il sera créé.");
            } else {
                console.error("❌ pushTip: Erreur lors de la récupération du fichier JSON existant:", e);
                throw e; // Relaunch the error
            }
        }

        let allTips = [];
        if (existingContent) {
            try {
                allTips = JSON.parse(existingContent);
                if (!Array.isArray(allTips)) {
                    console.warn("💾 pushTip: Le contenu JSON existant n'est pas un tableau. Il sera écrasé.");
                    allTips = []; // Réinitialise si le contenu n'est pas un tableau valide
                }
            } catch (jsonParseError) {
                console.error("❌ pushTip: Erreur de parsing du JSON existant. Le fichier sera initialisé.", jsonParseError);
                allTips = []; // Initialise à un tableau vide en cas d'erreur de parsing
            }
        }

        // Ajouter le nouveau tip
        newTip.id = Date.now().toString(); // Assure un ID unique basé sur le timestamp
        newTip.date_creation = new Date().toISOString(); // Date de soumission
        newTip.date_modification = new Date().toISOString(); // Date de modification (initialement la même que la création)

        // Assurez-vous que ces champs existent et sont non vides pour éviter des erreurs plus tard
        if (!newTip.previewText) newTip.previewText = "";
        if (!newTip.promptText) newTip.promptText = "";
        if (!newTip.categorie) newTip.categorie = "Autre";
        if (!newTip.outil) newTip.outil = "";

        allTips.push(newTip);

        const updatedContent = JSON.stringify(allTips, null, 2); // Formatage joli pour la lisibilité

        const commitMessage = `Ajout du tip "${newTip.titre || 'Sans titre'}" par ${newTip.auteur || 'Inconnu'}`;

        // Mettre à jour (ou créer) le fichier JSON des tips sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER, // CORRIGÉ
            repo: GITHUB_REPO,   // CORRIGÉ
            path: jsonFilePath,
            message: commitMessage,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: existingSha, // Nécessaire pour mettre à jour un fichier existant, null pour la création
            branch: 'main',
        });
        console.log("💾 pushTip: Fichier JSON des tips mis à jour sur GitHub.");
        // --- FIN : GESTION DU FICHIER JSON DES TIPS ---

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: 'Tip ajouté avec succès !',
                tip: newTip,
                imageUrl: uploadedImageUrl, // L'URL de la première image (si une image est uploadée)
                imageUrls: newTip.fileUrls // Toutes les URLs de fichiers (images et documents)
            }),
        };

    } catch (error) {
        console.error('❌ pushTip: Erreur critique lors de l\'ajout du tip à GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message || error}` }),
        };
    }
}
