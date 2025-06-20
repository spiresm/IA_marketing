// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty';
import fs from 'fs/promises';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // Assurez-vous que ces variables d'environnement sont définies dans Netlify
    const { GITHUB_TOKEN, OWNER, REPO, GITHUB_IMAGE_PATH, GITHUB_TIPS_PATH, GITHUB_PROFIL_PATH } = process.env;

    if (!GITHUB_TOKEN || !OWNER || !REPO || !GITHUB_IMAGE_PATH || !GITHUB_TIPS_PATH || !GITHUB_PROFIL_PATH) {
        console.error('❌ pushTip: Variables d\'environnement manquantes.');
        return { statusCode: 500, body: 'Variables d\'environnement manquantes.' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields;
    let files;
    let newTip = {};
    let firstImageFile = null;

    // --- CORRECTION CLÉ ICI : Gérer l'encodage base64 de l'event.body ---
    // Si le corps de l'événement est encodé en base64 (ce qui est courant avec Netlify Functions pour multipart/form-data)
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);

    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            // Passer le Buffer au lieu de l'event.body brut si c'est encodé
            form.parse(bodyBuffer, (err, fields, files) => { // <-- CHANGEMENT ICI : PASSER bodyBuffer
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

        // Le reste de votre code de gestion des fichiers et de l'interaction avec GitHub
        // ...
        // Je vais inclure le reste de votre code pour que ce soit complet.
        // Gérer les fichiers uploadés
        if (files && files.files && files.files.length > 0) { // 'files' est le nom du champ FormData côté client, ex: files[]
            // Ne pas utiliser firstImageFile pour la conversion base64 ici si vous l'avez supprimé plus bas.
            // La logique d'upload est gérée dans la boucle try/catch suivante
            console.log("📡 pushTip: Fichier(s) détecté(s) pour traitement.");
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data:', e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Attendu multipart/form-data.' }) };
    }
    // --- FIN NOUVEAU PARSING ---

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedImageUrl = null;
    let uploadedImageUrls = [];

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGES (plusieurs) ---
        if (files && files.files && files.files.length > 0) {
            console.log(`📡 pushTip: ${files.files.length} fichiers trouvés, tentative d'upload sur GitHub...`);
            for (const file of files.files) {
                const mimeType = file.headers['content-type'];
                if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') { // Ajout des types de documents
                    console.log(`📡 pushTip: Traitement du fichier: ${file.originalFilename} (${mimeType})`);
                    const fileBuffer = await fs.promises.readFile(file.path); // Lire le fichier depuis le chemin temporaire
                    const base64Data = fileBuffer.toString('base64');

                    const uniqueFileName = `${Date.now()}-${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    // Déterminer le chemin du fichier en fonction de son type
                    let filePathInRepo;
                    let fileBaseUrl;
                    if (mimeType.startsWith('image/')) {
                        filePathInRepo = `${GITHUB_IMAGE_PATH}/${uniqueFileName}`;
                        fileBaseUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${GITHUB_IMAGE_PATH}`;
                    } else { // Documents (txt, pdf)
                        // Assurez-vous d'avoir un chemin pour les documents dans vos variables d'environnement
                        const GITHUB_DOC_PATH = process.env.GITHUB_DOC_PATH || 'assets/documents'; // Définissez une variable ou utilisez une valeur par défaut
                        filePathInRepo = `${GITHUB_DOC_PATH}/${uniqueFileName}`;
                        fileBaseUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${GITHUB_DOC_PATH}`;
                    }

                    try {
                        const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
                            owner: OWNER,
                            repo: REPO,
                            path: filePathInRepo,
                            message: `Ajout du fichier ${file.originalFilename} pour le tip: ${newTip.titre || 'Sans titre'}`,
                            content: base64Data,
                            branch: 'main',
                        });
                        const currentFileUrl = `${fileBaseUrl}/${uniqueFileName}`;
                        uploadedImageUrls.push(currentFileUrl); // Utilise la même variable pour images et documents
                        console.log(`✅ pushTip: Fichier uploadé avec succès: ${currentFileUrl}`);
                    } catch (fileUploadError) {
                        console.error(`❌ pushTip: Erreur lors de l'upload du fichier ${file.originalFilename} à GitHub:`, fileUploadError);
                    }
                } else {
                    console.log(`⚠️ pushTip: Fichier non-pris en charge ignoré: ${file.originalFilename} (${mimeType})`);
                }
            }
            newTip.fileUrls = uploadedImageUrls; // Utilise une nouvelle propriété pour stocker toutes les URLs de fichiers (images et documents)
            // Si vous voulez une seule URL principale pour une vignette par exemple, vous pouvez la dériver ici
            uploadedImageUrl = uploadedImageUrls.length > 0 && uploadedImageUrls[0].startsWith(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${GITHUB_IMAGE_PATH}`) ? uploadedImageUrls[0] : null;

        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES/DOCUMENTS ---


        // --- DÉBUT : GESTION DU FICHIER JSON ---
        const jsonFilePath = GITHUB_TIPS_PATH;

        let existingContent = '';
        let existingSha = null;

        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: jsonFilePath,
                branch: 'main',
            });
            existingContent = Buffer.from(data.content, 'base64').toString('utf8');
            existingSha = data.sha;
            console.log("💾 pushTip: Fichier JSON existant récupéré. SHA:", existingSha);
        } catch (e) {
            if (e.status === 404) {
                console.log("💾 pushTip: Le fichier JSON n'existe pas encore, il sera créé.");
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
                    allTips = [];
                }
            } catch (jsonParseError) {
                console.error("❌ pushTip: Erreur de parsing du JSON existant:", jsonParseError);
                allTips = []; // Initialise à un tableau vide en cas d'erreur de parsing
            }
        }

        // Ajouter le nouveau tip
        newTip.id = Date.now().toString(); // Assurez un ID unique basé sur le timestamp
        newTip.date_creation = new Date().toISOString(); // Date de soumission
        newTip.date_modification = new Date().toISOString(); // Date de modification (initialement la même que la création)

        // Assurez-vous que ces champs existent et sont non vides, sinon supprimez-les ou donnez une valeur par défaut
        if (!newTip.previewText) newTip.previewText = "";
        if (!newTip.promptText) newTip.promptText = "";
        if (!newTip.categorie) newTip.categorie = "Autre";
        if (!newTip.outil) newTip.outil = "";

        allTips.push(newTip);

        const updatedContent = JSON.stringify(allTips, null, 2); // Formatage joli

        const commitMessage = `Ajout du tip "${newTip.titre}" par ${newTip.auteur}`;

        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: jsonFilePath,
            message: commitMessage,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: existingSha, // Nécessaire pour mettre à jour un fichier existant
            branch: 'main',
        });
        console.log("💾 pushTip: Fichier JSON mis à jour sur GitHub.");
        // --- FIN : GESTION DU FICHIER JSON ---

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
