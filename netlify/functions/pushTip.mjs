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
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Le corps doit être un JSON valide.' }) };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedImageUrl = null; // Pour stocker l'URL de l'image si elle est uploadée avec succès

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGE ---
        // On vérifie si le corps de la requête contient des données d'image (imageData et imageFileName)
        if (newTip.imageData && newTip.imageFileName) {
            console.log("Données d'image trouvées, tentative d'upload sur GitHub...");
            // Extrait les données Base64 pures et le type MIME de la Data URL
            const base64Data = newTip.imageData.split(';base64,').pop();
            const mimeType = newTip.imageData.split(';base64,')[0].split(':')[1];
            // Extrait l'extension du fichier (ex: png, jpeg)
            const fileExtension = mimeType.split('/')[1]; 

            // Crée un nom de fichier unique pour l'image sur GitHub
            // Utilise le timestamp pour l'unicité et nettoie le nom original
            const uniqueFileName = `${Date.now()}-${newTip.imageFileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            // Définit le chemin complet de l'image dans le dépôt GitHub
            const imagePathInRepo = `${GITHUB_IMAGE_PATH}/${uniqueFileName}`;

            try {
                // Tente de créer ou mettre à jour le fichier image sur GitHub
                await octokit.rest.repos.createOrUpdateFileContents({
                    owner: OWNER,
                    repo: REPO,
                    path: imagePathInRepo,
                    message: `Ajout de l'image pour le tip: ${newTip.titre}`, // Message de commit
                    content: base64Data, // Le contenu Base64 est directement utilisable par l'API GitHub
                    branch: 'main', // La branche cible
                });
                
                // Construit l'URL publique de l'image sur GitHub
                // C'est l'URL que nous utiliserons pour afficher l'image
                uploadedImageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${imagePathInRepo}`;
                console.log(`Image uploadée avec succès: ${uploadedImageUrl}`);
                
                // Ajoute cette URL au nouvel objet 'tip' avant de le sauvegarder dans all-tips.json
                // Ainsi, chaque tip aura une propriété 'imageUrl' si une image a été uploadée
                newTip.imageUrl = uploadedImageUrl;

            } catch (imageUploadError) {
                console.error('Erreur lors de l\'upload de l\'image à GitHub:', imageUploadError);
                // Si l'upload de l'image échoue, on continue sans l'image.
                // Vous pouvez choisir de rendre ceci bloquant si les images sont obligatoires.
            }
        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGE ---

        // Le reste de votre code pour gérer all-tips.json reste inchangé :
        // 1. Tenter de récupérer le contenu actuel du fichier de tips
        let fileData;
        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            fileData = response.data;
        } catch (error) {
            if (error.status === 404) {
                console.log(`Le fichier ${TIPS_FILE_PATH} n'existe pas, création d'un nouveau fichier.`);
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined };
            } else {
                throw error;
            }
        }

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const existingTips = JSON.parse(content);

        // 2. Ajouter le nouveau tip à la liste existante (avec ou sans imageUrl)
        const updatedTips = [...existingTips, { id: Date.now().toString(), ...newTip }];

        // 3. Mettre à jour (ou créer) le fichier sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout d'un nouveau tip par le formulaire${uploadedImageUrl ? ' avec image' : ''}`, // Message de commit mis à jour
            content: Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64'),
            sha: fileData.sha,
            branch: 'main'
        });

        // Réponse en cas de succès, inclut maintenant uploadedImageUrl
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip ajouté avec succès !', tip: newTip, imageUrl: uploadedImageUrl }),
        };

    } catch (error) {
        console.error('Erreur lors de l\'ajout du tip à GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message}` }),
        };
    }
}
