// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty';
import fs from 'fs/promises';
import { Readable } from 'stream'; // <--- NOUVEL IMPORT NÉCESSAIRE pour créer un stream

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // --------------------------------------------------------------------------
    // DÉBUT : CHEMINS DÉFINIS DIRECTEMENT DANS LE CODE (Option 2)
    // REMPLACEZ LES VALEURS PAR VOS CHEMINS RÉELS DANS VOTRE DÉPÔT GITHUB
    // --------------------------------------------------------------------------
    const GITHUB_IMAGE_PATH_CONST = 'assets/images'; // Exemple : 'assets/images'
    const GITHUB_TIPS_PATH_CONST = 'data/tips.json'; // Exemple : 'data/tips.json'
    const GITHUB_DOC_PATH_CONST = 'assets/documents'; // Chemin pour les documents (texte, PDF), peut être ajusté

    // --------------------------------------------------------------------------
    // DÉBUT : Variables d'environnement Netlify (celles qui DOIVENT être définies dans Netlify)
    // --------------------------------------------------------------------------
    const { 
        GITHUB_TOKEN, 
        GITHUB_OWNER,     // Correspond à 'GITHUB_OWNER' dans Netlify
        GITHUB_REPO,      // Correspond à 'GITHUB_REPO' dans Netlify
        // Les variables Google Sheets - à inclure si votre fonction interagit avec Sheets
        GOOGLE_SHEET_ID_TIPS,
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY
    } = process.env;

    // Vérification des variables d'environnement critiques (celles de Netlify)
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || 
        !GOOGLE_SHEET_ID_TIPS || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('❌ pushTip: Variables d\'environnement critiques manquantes. Veuillez vérifier Netlify.');
        return { statusCode: 500, body: 'Variables d\'environnement critiques manquantes.' };
    }
    // --------------------------------------------------------------------------
    // FIN : Variables d'environnement Netlify
    // --------------------------------------------------------------------------

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields;
    let files;
    let newTip = {};

    // --- CORRECTION CLÉ ICI ---
    // Créer un stream Readable à partir du corps de l'événement Netlify
    const requestStream = new Readable();
    // Pousser le corps décodé dans le stream
    requestStream.push(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8'));
    requestStream.push(null); // Signaler la fin du stream

    // Attacher les en-têtes et la méthode HTTP de l'événement au stream,
    // car multiparty en a besoin pour le parsing.
    requestStream.headers = event.headers;
    requestStream.method = event.httpMethod;

    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            // Passer le stream de requête à multiparty.form.parse()
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
        // Amélioration du message d'erreur pour le client si c'est une erreur de parsing
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
                // Inclure les types MIME spécifiques que vous souhaitez gérer
                if (mimeType.startsWith('image/') || mimeType === 'text/plain' || mimeType === 'application/pdf') { 
                    console.log(`📡 pushTip: Traitement du fichier: ${file.originalFilename} (${mimeType})`);
                    const fileBuffer = await fs.readFile(file.path); // Utiliser fs.readFile de fs/promises
                    const base64Data = fileBuffer.toString('base64');

                    const uniqueFileName = `${Date.now()}-${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    let filePathInRepo;
                    let fileBaseUrl;
                    if (mimeType.startsWith('image/')) {
                        filePathInRepo = `${GITHUB_IMAGE_PATH_CONST}/${uniqueFileName}`; // Utilisation de la constante
                        fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH_CONST}`; // Utilisation de la constante
                    } else { // Documents (txt, pdf)
                        filePathInRepo = `${GITHUB_DOC_PATH_CONST}/${uniqueFileName}`; // Utilisation de la constante
                        fileBaseUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_DOC_PATH_CONST}`; // Utilisation de la constante
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
            uploadedImageUrl = uploadedImageUrls.length > 0 && uploadedImageUrls[0].startsWith(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_IMAGE_PATH_CONST}`) ? uploadedImageUrls[0] : null;

        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES/DOCUMENTS ---


        // --- DÉBUT : GESTION DU FICHIER JSON DES TIPS ---
        const jsonFilePath = GITHUB_TIPS_PATH_CONST; // Chemin du fichier JSON, tiré de la constante

        let existingContent = '';
        let existingSha = null;

        try {
            // Récupérer le contenu actuel du fichier JSON des tips
            const { data } = await octokit.rest.repos.getContent({
                owner: GITHUB_OWNER, 
                repo: GITHUB_REPO,   
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
            owner: GITHUB_OWNER, 
            repo: GITHUB_REPO,   
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
