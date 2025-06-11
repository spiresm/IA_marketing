// netlify/functions/saveTip.mjs

import { Octokit } from '@octokit/rest'; // Utilisez 'import' pour les modules ES (mjs)

export const handler = async (event, context) => {
    // S'assure que seule la méthode POST est acceptée pour cette fonction
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Récupération des variables d'environnement
    // Assurez-vous que ces variables sont bien configurées dans Netlify !
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_REPO_OWNER;
    const REPO = process.env.GITHUB_REPO_NAME;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/tips.json'; // Chemin vers le fichier des tips

    // Vérification des variables d'environnement essentielles
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Missing GitHub environment variables!');
        return { statusCode: 500, body: 'Missing GitHub configuration.' };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const newTip = JSON.parse(event.body); // Parse le corps de la requête (le tip)
        // Validation simple des données du tip
        if (!newTip || !newTip.titre || !newTip.auteur || !newTip.prompt) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Données de tip invalides ou manquantes.' }) };
        }

        let existingTips = [];
        let sha = null; // SHA du fichier pour les mises à jour

        try {
            // Tente de récupérer le contenu actuel du fichier de tips
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
            });
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            existingTips = JSON.parse(content);
            sha = data.sha; // Récupère le SHA pour la mise à jour
        } catch (error) {
            // Si le fichier n'existe pas (status 404), on l'ignorera et le créera
            if (error.status === 404) {
                console.log(`Tips file not found at ${TIPS_FILE_PATH}, creating new one.`);
            } else {
                // Pour toute autre erreur que 404, propagez l'erreur
                console.error('Error fetching existing tips file:', error);
                throw error;
            }
        }

        // Ajoute le nouveau tip au tableau existant
        existingTips.push(newTip);
        // Convertit le tableau mis à jour en chaîne JSON formatée
        const updatedContent = JSON.stringify(existingTips, null, 2);

        // Met à jour (ou crée) le fichier sur GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout du tip: "${newTip.titre}" par ${newTip.auteur}`, // Message de commit
            content: Buffer.from(updatedContent).toString('base64'), // Contenu encodé en Base64
            sha: sha, // SHA requis pour les mises à jour (null si le fichier est nouveau)
            branch: 'main' // Assurez-vous que c'est votre branche par défaut (souvent 'main' ou 'master')
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Tip enregistré avec succès sur GitHub !' }),
        };

    } catch (error) {
        console.error('Error in saveTip function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Erreur interne lors de la sauvegarde du tip: ${error.message}` }),
        };
    }
};
