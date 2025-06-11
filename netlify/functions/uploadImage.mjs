// netlify/functions/uploadImage.mjs

import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer'; // Ceci est crucial pour gérer les données base64

export const handler = async (event) => {
    // S'assurer que seules les requêtes POST sont autorisées
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Récupérer les variables d'environnement avec les noms que vous utilisez actuellement
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER; // Votre variable GITHUB_OWNER
    const REPO = process.env.GITHUB_REPO;   // Votre variable GITHUB_REPO
    
    // Le chemin des images, comme dans votre ancien code, est 'images/'
    const IMAGES_DIR = 'images'; 

    // Valider les variables d'environnement essentielles
    // La validation se concentre maintenant sur les variables que vous avez fournies.
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Variables d\'environnement GitHub manquantes pour uploadImage !');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: 'Configuration d\'upload d\'image manquante. Veuillez vérifier GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO dans vos variables d\'environnement Netlify.' 
            }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const { fileBase64, fileName } = JSON.parse(event.body);
        if (!fileBase64 || !fileName) {
            console.error('fileBase64 ou fileName manquant dans le corps de la requête.');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Données d\'image manquantes (base64 ou nom de fichier).' }),
            };
        }

        // Construire le chemin complet du fichier dans le dépôt, avec un timestamp pour l'unicité
        const filePath = `${IMAGES_DIR}/${Date.now()}-${fileName}`;
        let sha = null; // Utilisé si le fichier existe déjà pour le mettre à jour

        // Tenter de récupérer le SHA du fichier s'il existe déjà
        try {
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: filePath,
            });
            sha = data.sha;
        } catch (error) {
            // Si le fichier n'existe pas (erreur 404), c'est normal pour un nouvel upload
            if (error.status === 404) {
                console.log(`Fichier image non trouvé à ${filePath}, procéder à la création.`);
            } else {
                // Pour toute autre erreur, la propager
                console.error('Erreur lors de la vérification du fichier image existant :', error);
                throw error;
            }
        }

        // Créer ou mettre à jour le fichier sur GitHub
        const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            message: `Upload de l'image : ${fileName}`, // Message de commit
            content: fileBase64, // Le contenu est déjà en base64
            sha: sha, // Fourni si mise à jour, sinon null pour la création
            branch: 'main', // Assurez-vous que c'est votre branche par défaut
            committer: { // Détails du committer pour l'historique Git
                name: "Netlify Bot",
                email: "bot@netlify.com"
            }
        });

        // Construire l'URL publique de l'image pour l'affichage
        const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${filePath}`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, message: 'Image uploadée avec succès sur GitHub !' }),
        };

    } catch (error) {
        // Gérer les erreurs survenues pendant l'exécution de la fonction
        console.error('Erreur dans la fonction uploadImage :', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'upload de l'image : ${error.message}` }),
        };
    }
};
