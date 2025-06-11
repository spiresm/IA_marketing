// netlify/functions/save-tip.mjs
import { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer'; // Nécessaire pour Buffer en environnement Node.js

export const handler = async (event) => {
    // S'assure que seule la méthode POST est acceptée pour cette fonction
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Récupération des variables d'environnement
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin par défaut du fichier de tips
    const NETLIFY_BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK_URL; // URL du Build Hook pour déclencher un déploiement

    // Vérification des variables d'environnement essentielles
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Missing GitHub environment variables for save-tip!');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Configuration GitHub manquante. Veuillez vérifier GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO dans vos variables d\'environnement Netlify.'
            }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const newTip = JSON.parse(event.body); // Parse le corps de la requête (le tip)

        // Validation simple des données du tip (ajoutez 'auteur' ici si votre formulaire l'envoie)
        if (!newTip || !newTip.titre || !newTip.description || !newTip.prompt || !newTip.outil || !newTip.categorie) {
            console.error('Invalid or missing tip data:', newTip);
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Données de tip invalides ou manquantes. Veuillez remplir tous les champs.' }),
            };
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
            // Décode le contenu Base64 en UTF-8 et le parse en JSON
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            existingTips = JSON.parse(content);
            sha = data.sha; // Récupère le SHA pour la mise à jour
        } catch (error) {
            // Si le fichier n'existe pas (status 404), on l'ignore et le créera
            if (error.status === 404) {
                console.log(`Tips file not found at ${TIPS_FILE_PATH}, creating new one.`);
                // Si le fichier n'existe pas, existingTips reste un tableau vide [] et sha est null
            } else {
                // Pour toute autre erreur que 404, propagez l'erreur
                console.error('Error fetching existing tips file:', error);
                return {
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Failed to fetch existing tips file: ${error.message}` }),
                };
            }
        }

        // Ajoute le nouveau tip au tableau existant
        existingTips.push(newTip);
        // Convertit le tableau mis à jour en chaîne JSON formatée (pour une meilleure lisibilité dans GitHub)
        const updatedContent = JSON.stringify(existingTips, null, 2);

        // Met à jour (ou crée) le fichier sur GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout du tip: "${newTip.titre}"`, // Message de commit
            content: Buffer.from(updatedContent).toString('base64'), // Contenu encodé en Base64
            sha: sha, // SHA requis pour les mises à jour (sera null si le fichier est nouveau)
            branch: 'main' // Assurez-vous que c'est votre branche par défaut (souvent 'main' ou 'master')
        });

        // --- Déclenchement du Build Hook Netlify ---
        if (NETLIFY_BUILD_HOOK_URL) {
            console.log('Attempting to trigger Netlify build hook...');
            const buildHookResponse = await fetch(NETLIFY_BUILD_HOOK_URL, { method: 'POST' });
            if (!buildHookResponse.ok) {
                console.error('Failed to trigger Netlify build hook:', buildHookResponse.status, buildHookResponse.statusText);
            } else {
                console.log('Netlify build hook triggered successfully.');
            }
        } else {
            console.warn('NETLIFY_BUILD_HOOK_URL est manquant. Le déploiement automatique ne sera pas déclenché.');
        }
        // --- Fin du Déclenchement du Build Hook Netlify ---

        // Retourne une réponse de succès
        return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*', // Autoriser les requêtes CORS
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: 'Tip enregistré avec succès sur GitHub et déploiement Netlify déclenché !' }),
        };

    } catch (error) {
        // Gestion des erreurs internes de la fonction
        console.error('Error in save-tip function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Erreur interne lors de la sauvegarde du tip: ${error.message}` }),
        };
    }
};
