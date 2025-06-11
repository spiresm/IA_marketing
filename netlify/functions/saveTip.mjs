// netlify/functions/save-tip.mjs (ou saveTip.js si vous n'utilisez pas de modules ES6)
import { Octokit } from "@octokit/rest"; // Importation essentielle !
import { Buffer } from 'buffer'; // Nécessaire pour Buffer en environnement Node.js

export const handler = async (event, context) => {
    // Vérifier si la méthode HTTP est POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Méthode non autorisée. Seul POST est accepté.' }),
        };
    }

    const {
        id, titre, description, prompt, outil, categorie, auteur, chaine,
        imageUrl, imageData, imageFileName, exemple // imageData et imageFileName sont pour l'upload
    } = JSON.parse(event.body);

    // Logs pour le débogage (ceux que vous avez vus)
    console.log("--------------------------------------");
    console.log("Tip reçu et prêt à être sauvegardé:");
    console.log("ID:", id); // Important de logger l'ID aussi
    console.log("Auteur:", auteur);
    console.log("Titre:", titre);
    console.log("Description:", description);
    console.log("Prompt:", prompt);
    console.log("Catégorie:", categorie);
    console.log("Plateforme/Outil:", outil); // Note: Ici, c'est 'outil', pas 'plateforme'
    console.log("Chaîne:", chaine);
    console.log("Image URL (si fournie):", imageUrl);
    console.log("Image data (présente?):", !!imageData); // Indique si imageData est non vide
    console.log("Image file name (si fournie):", imageFileName);
    console.log("Exemple:", exemple);
    console.log("Timestamp:", new Date().toISOString());
    console.log("--------------------------------------");


    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin par défaut

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Erreur de configuration: GITHUB_TOKEN, OWNER ou REPO manquant.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN }); // Initialisation de Octokit !

    try {
        let finalImageUrl = imageUrl;
        let imageSha = null; // Pour stocker le SHA de l'image si elle est mise à jour

        // --- 1. GESTION DE L'IMAGE (UPLOAD / MISE À JOUR) ---
        if (imageData && imageFileName) {
            console.log("Tentative d'upload/mise à jour de l'image...");
            const imagePath = `images/${imageFileName}`; // Chemin où l'image sera sauvegardée dans le repo

            try {
                // Tenter de récupérer le SHA de l'image existante si elle existe déjà
                let existingImageSha = null;
                try {
                    const { data: existingImageData } = await octokit.repos.getContent({
                        owner: OWNER,
                        repo: REPO,
                        path: imagePath,
                        ref: 'main'
                    });
                    existingImageSha = existingImageData.sha;
                    console.log(`Image existante trouvée, SHA: ${existingImageSha}`);
                } catch (error) {
                    if (error.status === 404) {
                        console.log('Image non trouvée, elle sera créée.');
                    } else {
                        console.error('Erreur lors de la vérification de l\'image existante:', error);
                        // Ne pas bloquer si on ne peut pas vérifier l'image existante, on tentera de créer
                    }
                }

                const imageContent = Buffer.from(imageData, 'base64').toString('base64');

                const commitMessageImage = existingImageSha ?
                    `Update image: ${imageFileName} for tip ${id || 'new'}` :
                    `Add image: ${imageFileName} for tip ${id || 'new'}`;

                const uploadImageResponse = await octokit.repos.createOrUpdateFileContents({
                    owner: OWNER,
                    repo: REPO,
                    path: imagePath,
                    message: commitMessageImage,
                    content: imageContent,
                    sha: existingImageSha,
                    branch: 'main',
                    committer: {
                        name: 'Netlify Bot',
                        email: 'netlify-bot@example.com',
                    },
                    author: {
                        name: 'Netlify Bot',
                        email: 'netlify-bot@example.com',
                    },
                });

                finalImageUrl = uploadImageResponse.data.content.html_url
                                ? uploadImageResponse.data.content.html_url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/')
                                : `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${imagePath}`; // Fallback pour URL brute

                imageSha = uploadImageResponse.data.content.sha;
                console.log('Image uploadée/mise à jour sur GitHub:', finalImageUrl);

            } catch (imageError) {
                console.error('Erreur lors de l\'upload de l\'image sur GitHub:', imageError);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: `Échec de l'upload de l'image : ${imageError.message || imageError}` }),
                };
            }
        }

        // --- 2. MISE À JOUR DU FICHIER all-tips.json ---
        console.log("Tentative de récupération du fichier tips existant...");
        let existingTipsContent;
        let existingTipsSha;
        let tips = [];

        try {
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main'
            });
            existingTipsContent = Buffer.from(data.content, 'base64').toString('utf8');
            existingTipsSha = data.sha;
            tips = JSON.parse(existingTipsContent);
            console.log(`Fichier ${TIPS_FILE_PATH} récupéré. SHA: ${existingTipsSha}`);
        } catch (error) {
            if (error.status === 404) {
                console.log(`Fichier ${TIPS_FILE_PATH} non trouvé, création d'un nouveau fichier.`);
                // Si le fichier n'existe pas, on part d'un tableau vide et existingTipsSha reste null
            } else {
                console.error('Erreur lors de la récupération du fichier de tips existant:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: `Erreur lors de la récupération du fichier de tips existant: ${error.message}` }),
                };
            }
        }

        const newTip = {
            id: id || Date.now().toString(),
            titre: titre || 'Titre par défaut',
            description: description || '',
            prompt: prompt || '',
            outil: outil || 'Inconnu', // Utilisez 'outil' ici pour correspondre à votre frontend
            categorie: categorie || 'Non spécifiée',
            auteur: auteur || 'Anonyme',
            chaine: chaine || 'N/A',
            date: new Date().toISOString(),
            imageUrl: finalImageUrl,
            exemple: exemple || ''
        };

        const tipIndex = tips.findIndex(t => t.id === newTip.id);
        if (tipIndex > -1) {
            tips[tipIndex] = newTip;
            console.log(`Tip existant (ID: ${newTip.id}) mis à jour.`);
        } else {
            tips.push(newTip);
            console.log(`Nouveau tip (ID: ${newTip.id}) ajouté.`);
        }

        const updatedContent = JSON.stringify(tips, null, 2);

        console.log(`Tentative de mise à jour du fichier ${TIPS_FILE_PATH} sur GitHub...`);
        const commitMessageTips = tipIndex > -1 ?
            `Update tip: ${newTip.titre} (ID: ${newTip.id})` :
            `Add new tip: ${newTip.titre} (ID: ${newTip.id})`;

        const uploadTipsResponse = await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: commitMessageTips,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: existingTipsSha,
            branch: 'main',
            committer: {
                name: 'Netlify Bot',
                email: 'netlify-bot@example.com',
            },
            author: {
                name: 'Netlify Bot',
                email: 'netlify-bot@example.com',
            },
        });
        console.log(`Fichier ${TIPS_FILE_PATH} mis à jour sur GitHub.`);


        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ message: 'Tip sauvegardé avec succès!', tipId: newTip.id }),
        };

    } catch (error) {
        console.error('Erreur globale lors de la sauvegarde du tip sur GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur lors de la sauvegarde du tip: ${error.message}` }),
        };
    }
};
