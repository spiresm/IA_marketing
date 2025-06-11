// netlify/functions/save-tip.mjs
import { Octokit } from '@octokit/rest';
// 'buffer' est une dépendance Node.js native, pas besoin de l'installer via npm
// Si vous rencontrez des problèmes avec 'Buffer' dans Netlify Functions,
// cela peut être dû à un environnement Node.js obsolète ou à un problème de polyfill.
// Souvent, la version Node.js par défaut de Netlify est suffisante.
// Si vraiment nécessaire, on pourrait implémenter un encodage Base64 manuel ou chercher une autre lib.
// Pour l'instant, partons du principe que 'Buffer' est disponible.
import { Buffer } from 'buffer';

export const handler = async (event) => {
    // S'assure que seule la méthode POST est acceptée pour cette fonction
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Récupération des variables d'environnement
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER; // Nom d'utilisateur/organisation GitHub
    const REPO = process.env.GITHUB_REPO;   // Nom du dépôt GitHub
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin du fichier JSON
    const NETLIFY_BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK_URL; // URL du Build Hook pour déclencher un déploiement

    // Vérification des variables d'environnement essentielles
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Erreur: Variables d\'environnement GitHub manquantes pour save-tip.');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Configuration GitHub manquante. Vérifiez GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO dans Netlify.'
            }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const newTip = JSON.parse(event.body); // Parse le corps de la requête (le tip)

        // Validation des données du tip (ajoutez/supprimez des champs selon votre formulaire)
        if (!newTip || !newTip.titre || !newTip.description || !newTip.prompt || !newTip.outil || !newTip.categorie || !newTip.auteur) {
            console.error('Données de tip invalides ou manquantes:', newTip);
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Données de tip invalides ou manquantes. Veuillez remplir tous les champs (titre, description, prompt, outil, catégorie, auteur).' }),
            };
        }

        let existingTips = [];
        let sha = null; // SHA du fichier pour les mises à jour (important pour l'API GitHub)

        try {
            // Tente de récupérer le contenu actuel du fichier de tips
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main' // Spécifiez la branche pour être sûr
            });
            // Décode le contenu Base64 en UTF-8 et le parse en JSON
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            existingTips = JSON.parse(content);
            sha = data.sha; // Récupère le SHA pour la mise à jour
        } catch (error) {
            // Si le fichier n'existe pas (status 404), on l'ignore et le créera
            if (error.status === 404) {
                console.log(`Le fichier de tips n'existe pas encore à ${TIPS_FILE_PATH}, il sera créé.`);
            } else {
                // Pour toute autre erreur que 404, propagez l'erreur
                console.error('Erreur lors de la récupération du fichier de tips existant:', error);
                return {
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Échec de la récupération du fichier de tips existant: ${error.message}` }),
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
            message: `Ajout du tip: "${newTip.titre}" par ${newTip.auteur}`, // Message de commit
            content: Buffer.from(updatedContent).toString('base64'), // Contenu encodé en Base64
            sha: sha, // SHA requis pour les mises à jour (sera null si le fichier est nouveau)
            branch: 'main' // Assurez-vous que c'est votre branche de déploiement par défaut
        });

        // --- Déclenchement du Build Hook Netlify ---
        if (NETLIFY_BUILD_HOOK_URL) {
            console.log('Tentative de déclenchement du Build Hook Netlify...');
            const buildHookResponse = await fetch(NETLIFY_BUILD_HOOK_URL, { method: 'POST' });
            if (!buildHookResponse.ok) {
                console.error('Échec du déclenchement du Build Hook Netlify:', buildHookResponse.status, buildHookResponse.statusText);
            } else {
                console.log('Build Hook Netlify déclenché avec succès.');
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
        console.error('Erreur interne dans la fonction save-tip:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Erreur interne lors de la sauvegarde du tip: ${error.message}` }),
        };
    }
};
