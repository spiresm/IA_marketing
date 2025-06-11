// netlify/functions/delete-tip.mjs
import { Octokit } from "@octokit/rest";
import { Buffer } from 'buffer'; // Module intégré à Node.js pour gérer les données binaires

export default async (event, context) => {
    // Vérifier si la méthode HTTP est DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Méthode non autorisée. Seule la méthode DELETE est acceptée.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Récupérer l'ID du tip à supprimer depuis les paramètres de la requête (query string)
    const tipId = event.queryStringParameters.id;

    if (!tipId) {
        console.error('Erreur: ID du tip manquant dans la requête.');
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'ID du tip manquant.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Configuration des accès GitHub via les variables d'environnement Netlify
    // Assurez-vous que ces variables sont bien configurées dans votre tableau de bord Netlify.
    const githubToken = process.env.GITHUB_PAT; // Votre Personal Access Token GitHub (avec les droits 'repo')
    const repoOwner = process.env.GITHUB_OWNER; // Votre nom d'utilisateur ou celui de l'organisation GitHub
    const repoName = process.env.GITHUB_REPO;   // Le nom de votre dépôt GitHub (ex: IA_marketing)
    const filePath = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Chemin vers votre fichier JSON dans le dépôt
    const branch = 'main'; // La branche de votre dépôt où se trouve le fichier (généralement 'main' ou 'master')

    // Vérification des variables d'environnement essentielles
    if (!githubToken || !repoOwner || !repoName) {
        console.error('Erreur de configuration: GITHUB_PAT, GITHUB_OWNER ou GITHUB_REPO manquant.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante sur le serveur.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    const octokit = new Octokit({ auth: githubToken });

    try {
        // 1. Récupérer le contenu actuel du fichier all-tips.json depuis GitHub
        console.log(`Tentative de lecture du fichier ${filePath} depuis GitHub...`);
        let fileResponse;
        try {
            fileResponse = await octokit.repos.getContents({
                owner: repoOwner,
                repo: repoName,
                path: filePath,
                ref: branch
            });
        } catch (getContentsError) {
            if (getContentsError.status === 404) {
                console.warn(`Le fichier ${filePath} n'existe pas encore sur GitHub. Création d'un tableau vide.`);
                // Si le fichier n'existe pas, on initialise un tableau vide et on gérera la création plus tard
                fileResponse = { data: { sha: null, content: Buffer.from(JSON.stringify([])).toString('base64') } };
            } else {
                console.error(`Erreur lors de la récupération du fichier ${filePath} depuis GitHub:`, getContentsError);
                throw new Error(`Échec de la lecture des tips depuis GitHub: ${getContentsError.message}`);
            }
        }

        const currentFileSha = fileResponse.data.sha;
        const currentContentBase64 = fileResponse.data.content;
        let tipsData = JSON.parse(Buffer.from(currentContentBase64, 'base64').toString('utf8'));
        console.log(`Fichier ${filePath} récupéré. SHA: ${currentFileSha}. Nombre de tips: ${tipsData.length}`);

        // 2. Filtrer la liste pour retirer le tip avec l'ID donné
        const initialLength = tipsData.length;
        const updatedTips = tipsData.filter(tip => String(tip.id) !== String(tipId)); // Convertir en String pour une comparaison fiable
        console.log(`Tentative de suppression du tip ID: ${tipId}. Tips avant: ${initialLength}, Tips après: ${updatedTips.length}`);


        if (updatedTips.length === initialLength) {
            // Aucun tip n'a été supprimé, l'ID n'a pas été trouvé ou a échoué la conversion String
            console.warn(`Tip avec l'ID ${tipId} non trouvé ou aucune modification effectuée.`);
            return {
                statusCode: 404, // 404 car la ressource spécifique n'a pas été trouvée pour être supprimée
                body: JSON.stringify({ message: `Tip avec l'ID ${tipId} non trouvé.` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // 3. Préparer le nouveau contenu JSON (encodé en base64)
        const newContentBase64 = Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64');

        // 4. Mettre à jour le fichier all-tips.json sur GitHub
        console.log(`Tentative de mise à jour du fichier ${filePath} sur GitHub...`);
        await octokit.repos.createOrUpdateFileContents({
            owner: repoOwner,
            repo: repoName,
            path: filePath,
            message: `Suppression du tip: ${tipId}`, // Message de commit sur GitHub
            content: newContentBase64,
            sha: currentFileSha, // Le SHA est OBLIGATOIRE pour la mise à jour d'un fichier existant
            branch: branch,
            committer: {
                name: 'Netlify Automation Bot',
                email: 'netlify-bot@example.com',
            },
            author: {
                name: 'Netlify Automation Bot',
                email: 'netlify-bot@example.com',
            },
        });
        console.log(`Fichier ${filePath} mis à jour avec succès sur GitHub.`);

        // 5. Déclencher un nouveau déploiement sur Netlify
        // Cela est crucial pour que les changements dans all-tips.json soient propagés sur votre site live.
        const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
        if (buildHookUrl) {
            console.log('Déclenchement du build hook Netlify...');
            const buildResponse = await fetch(buildHookUrl, { method: 'POST' });
            if (!buildResponse.ok) {
                console.error(`Échec du déclenchement du build hook Netlify: ${buildResponse.status} ${buildResponse.statusText}`);
            } else {
                console.log('Build hook Netlify déclenché avec succès.');
            }
        } else {
            console.warn('La variable NETLIFY_BUILD_HOOK_URL n\'est pas configurée. Un déploiement manuel sera nécessaire pour voir les changements.');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip supprimé avec succès et déploiement déclenché.' }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error('Erreur inattendue dans la fonction delete-tip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Échec de la suppression du tip: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
