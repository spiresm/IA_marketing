// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // Variables d'environnement pour l'authentification GitHub
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';
    // NOUVELLE VARIABLE : Chemin où les images seront stockées dans le dépôt GitHub
    // Assurez-vous de définir GITHUB_IMAGE_PATH dans vos variables d'environnement Netlify (ex: assets/tips/images)
    const GITHUB_IMAGE_PATH = process.env.GITHUB_IMAGE_PATH || 'assets/tips/images'; 

    // Vérification de la configuration minimale
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('❌ pushTip: Configuration de l\'API GitHub (TOKEN, OWNER, REPO) manquante.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante. Veuillez définir GITHUB_TOKEN, GITHUB_OWNER et GITHUB_REPO dans vos variables d\'environnement Netlify.' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let newTip;
    try {
        newTip = JSON.parse(event.body);
    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing JSON du corps de la requête:', e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Le corps doit être un JSON valide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedImageUrl = null; // Pour stocker l'URL de l'image si elle est uploadée avec succès

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGE ---
        // On vérifie si le corps de la requête contient des données d'image (imageData et imageFileName)
        if (newTip.imageData && newTip.imageFileName) {
            console.log("📡 pushTip: Données d'image trouvées, tentative d'upload sur GitHub...");
            // Extrait les données Base64 pures et le type MIME de la Data URL
            const base64Data = newTip.imageData.split(';base64,').pop();
            const mimeType = newTip.imageData.split(';base64,')[0].split(':')[1];
            // Extrait l'extension du fichier (ex: png, jpeg)
            // const fileExtension = mimeType.split('/')[1]; // Pas directement utilisé ici, mais bon à savoir

            // Crée un nom de fichier unique pour l'image sur GitHub
            // Utilise le timestamp pour l'unicité et nettoie le nom original
            const uniqueFileName = `${Date.now()}-${newTip.imageFileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            // Définit le chemin complet de l'image dans le dépôt GitHub
            const imagePathInRepo = `${GITHUB_IMAGE_PATH}/${uniqueFileName}`;

            try {
                // Tente de créer ou mettre à jour le fichier image sur GitHub
                const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
                    owner: OWNER,
                    repo: REPO,
                    path: imagePathInRepo,
                    message: `Ajout de l'image pour le tip: ${newTip.titre}`, // Message de commit
                    content: base64Data, // Le contenu Base64 est directement utilisable par l'API GitHub
                    branch: 'main', // La branche cible
                });
                
                // Construite l'URL publique de l'image sur GitHub
                // Utilise le raw.githubusercontent.com pour l'accès direct aux fichiers bruts
                uploadedImageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${imagePathInRepo}`;
                console.log(`✅ pushTip: Image uploadée avec succès: ${uploadedImageUrl}`);
                
                // Ajoute cette URL au nouvel objet 'tip' avant de le sauvegarder dans all-tips.json
                // Ainsi, chaque tip aura une propriété 'imageUrl' si une image a été uploadée
                newTip.imageUrl = uploadedImageUrl;

            } catch (imageUploadError) {
                console.error('❌ pushTip: Erreur lors de l\'upload de l\'image à GitHub:', imageUploadError);
                // Si l'upload de l'image échoue, on continue sans l'image.
                // Vous pouvez choisir de rendre ceci bloquant si les images sont obligatoires.
            }
        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGE ---

        // --- AJOUT AUTOMATIQUE DE LA DATE DE CRÉATION ---
        // Ajout ou mise à jour du champ date_ajout avec la date et l'heure actuelles
        // Utilisez toISOString() pour un format standard et facile à trier (ex: "2023-10-27T10:00:00.000Z")
        newTip.date_ajout = new Date().toISOString(); 
        console.log(`✅ pushTip: 'date_ajout' ajoutée au nouveau tip: ${newTip.date_ajout}`);
        // --- FIN DE L'AJOUT DE LA DATE ---

        // Le reste de votre code pour gérer all-tips.json :
        // 1. Tenter de récupérer le contenu actuel du fichier de tips
        let fileData;
        let existingTips = [];
        try {
            console.log(`📡 pushTip: Tentative de récupération du fichier: ${TIPS_FILE_PATH}`);
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            fileData = response.data;
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            existingTips = JSON.parse(content);
            console.log(`✅ pushTip: Fichier ${TIPS_FILE_PATH} récupéré et parsé. ${existingTips.length} tips existants.`);
        } catch (error) {
            if (error.status === 404) {
                console.warn(`⚠️ pushTip: Le fichier ${TIPS_FILE_PATH} n'existe pas, initialisation avec un tableau vide.`);
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined }; // sha sera undefined pour une création
                existingTips = [];
            } else {
                console.error('❌ pushTip: Erreur lors de la récupération du fichier de tips existant:', error);
                throw error; // Propage l'erreur si ce n'est pas un 404
            }
        }

        // 2. Ajouter un ID unique au nouveau tip (si ce n'est pas déjà fait)
        // Utilisation de Date.now() pour l'ID est un bon point de départ pour la chronologie.
        // On s'assure d'ajouter l'ID ici si ce n'est pas fait avant pour le cas où newTip n'en aurait pas.
        const tipWithId = { id: Date.now().toString(), ...newTip };

        // 3. Ajouter le nouveau tip à la liste existante
        const updatedTips = [...existingTips, tipWithId];
        console.log(`📡 pushTip: Nouveau tip ajouté à la liste. Total: ${updatedTips.length} tips.`);

        // 4. Mettre à jour (ou créer) le fichier sur GitHub
        console.log(`📡 pushTip: Tentative de mise à jour du fichier ${TIPS_FILE_PATH} sur GitHub.`);
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout d'un nouveau tip par le formulaire${uploadedImageUrl ? ' avec image' : ''}`, // Message de commit mis à jour
            content: Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64'),
            sha: fileData.sha, // Nécessaire pour les mises à jour, sera undefined pour la création initiale
            branch: 'main'
        });
        console.log(`✅ pushTip: Fichier ${TIPS_FILE_PATH} mis à jour avec succès sur GitHub.`);

        // Réponse en cas de succès, inclut maintenant uploadedImageUrl et le tip final
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip ajouté avec succès !', tip: tipWithId, imageUrl: uploadedImageUrl }),
        };

    } catch (error) {
        console.error('❌ pushTip: Erreur critique lors de l\'ajout du tip à GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message}` }),
        };
    }
}
