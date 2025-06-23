// netlify/functions/rate-tip.mjs
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import fetch from 'node-fetch'; // Nécessaire pour télécharger le contenu si > 1MB

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event, context) => {
    console.log("--- Début de l'exécution de rate-tip ---");

    // Gérer les requêtes OPTIONS (pré-vol CORS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez POST.' }),
        };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';
    const COMMIT_MESSAGE = "Update tip rating";

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('❌ rate-tip: Configuration de l\'API GitHub (TOKEN, OWNER, REPO) manquante.');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: 'Configuration de l\'API GitHub manquante. Contactez l\'administrateur.' }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (parseError) {
        console.error('❌ rate-tip: Erreur de parsing JSON du corps de la requête:', parseError);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: 'Format de requête invalide. Attendu JSON.' }),
        };
    }

    const { id: tipId, rating: newRating } = body;

    if (!tipId || typeof newRating !== 'number' || newRating < 1 || newRating > 5) {
        console.error('❌ rate-tip: Données de note invalides. Reçu:', body);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: 'ID du tip ou note invalide (doit être un nombre entre 1 et 5).' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // 1. Récupérer le contenu actuel du fichier
        console.log(`📡 rate-tip: Tentative de récupération du fichier: ${TIPS_FILE_PATH}`);
        const { data: file } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main',
        });

        let currentContent;
        if (file.content && file.encoding === 'base64') {
            currentContent = Buffer.from(file.content, 'base64').toString('utf8');
        } else if (file.download_url) {
            const rawResponse = await fetch(file.download_url);
            if (!rawResponse.ok) {
                throw new Error(`Failed to download raw content: ${rawResponse.statusText}`);
            }
            currentContent = await rawResponse.text();
        } else {
            throw new Error('Impossible de récupérer le contenu du fichier tips: Format de réponse GitHub inattendu.');
        }

        const tips = JSON.parse(currentContent);
        const tipIndex = tips.findIndex(t => t.id === tipId);

        if (tipIndex === -1) {
            console.error(`❌ rate-tip: Tip avec l'ID ${tipId} non trouvé.`);
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, message: 'Tip non trouvé.' }),
            };
        }

        const currentTip = tips[tipIndex];

        // Assurer que les propriétés de notation existent
        const oldAverageRating = typeof currentTip.averageRating === 'number' ? currentTip.averageRating : 0;
        const oldRatingCount = typeof currentTip.ratingCount === 'number' ? currentTip.ratingCount : 0;

        // Calculer la nouvelle moyenne
        const newTotalRatingSum = (oldAverageRating * oldRatingCount) + newRating;
        const newRatingCount = oldRatingCount + 1;
        const newAverageRating = newTotalRatingSum / newRatingCount;

        // Mettre à jour le tip
        tips[tipIndex].averageRating = newAverageRating;
        tips[tipIndex].ratingCount = newRatingCount;

        const updatedContent = JSON.stringify(tips, null, 2); // Indentation pour la lisibilité

        // 2. Mettre à jour le fichier sur GitHub
        console.log(`📡 rate-tip: Tentative de mise à jour du fichier ${TIPS_FILE_PATH} sur GitHub.`);
        await octokit.rest.repos.updateFile({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: COMMIT_MESSAGE,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: file.sha, // Important pour éviter les conflits
            branch: 'main', // Ou la branche par défaut de votre repo
        });

        console.log(`✅ rate-tip: Note pour le tip ${tipId} mise à jour avec succès. Nouvelle moyenne: ${newAverageRating.toFixed(1)}, Total votes: ${newRatingCount}`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Note enregistrée avec succès.',
                newAverageRating: newAverageRating,
                newRatingCount: newRatingCount
            }),
        };

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la note:', error);
        let errorMessage = 'Erreur interne du serveur lors de la mise à jour de la note.';
        if (error.status === 409) {
            errorMessage = 'Conflit de version du fichier. Veuillez réessayer.';
            console.error('⚠️ rate-tip: Conflit de version du fichier. SHA mismatch.');
        } else if (error.message.includes('sha')) {
            errorMessage = 'Erreur de synchronisation du fichier. Veuillez réessayer.';
            console.error('⚠️ rate-tip: SHA invalide ou manquant dans la requête GitHub.');
        } else if (error.status === 404) {
             errorMessage = `Fichier ${TIPS_FILE_PATH} non trouvé sur GitHub.`;
        }

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: errorMessage }),
        };
    } finally {
        console.log("--- Fin de l'exécution de rate-tip ---");
    }
};
