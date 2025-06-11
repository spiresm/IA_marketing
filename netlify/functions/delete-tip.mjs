// netlify/functions/delete-tip.mjs
import { Octokit } from "@octokit/rest";
import { Buffer } from 'buffer';

export default async (event, context) => {
    // Vérifier si la méthode HTTP est DELETE
    if (event.httpMethod !== 'DELETE') {
        return new Response(JSON.stringify({ message: 'Méthode non autorisée. Seule la méthode DELETE est acceptée.' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Récupérer l'ID du tip à supprimer depuis les paramètres de la requête (query string)
    const tipId = event.queryStringParameters.id;

    if (!tipId) {
        console.error('Erreur: ID du tip manquant dans la requête.');
        return new Response(JSON.stringify({ message: 'ID du tip manquant.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Configuration des accès GitHub via les variables d'environnement Netlify
    const githubToken = process.env.GITHUB_PAT;
    const repoOwner = process.env.GITHUB_OWNER;
    const repoName = process.env.GITHUB_REPO;
    const filePath = process.env.TIPS_FILE_PATH || 'data/all-tips.json';
    const branch = 'main';

    if (!githubToken || !repoOwner || !repoName) {
        console.error('Erreur de configuration: GITHUB_PAT, GITHUB_OWNER ou GITHUB_REPO manquant.');
        return new Response(JSON.stringify({ message: 'Configuration de l\'API GitHub manquante sur le serveur.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
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
                fileResponse = { data: { sha: null, content: Buffer.from(JSON.stringify([])).toString('base64') } };
            } else {
                console.error(`Erreur lors de la récupération du fichier ${filePath} depuis GitHub:`, getContentsError);
                return new Response(JSON.stringify({ message: `Échec de la lecture des tips depuis GitHub: ${getContentsError.message}` }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        const currentFileSha = fileResponse.data.sha;
        const currentContentBase64 = fileResponse.data.content;
        let tipsData = JSON.parse(Buffer.from(currentContentBase64, 'base64').toString('utf8'));
        console.log(`Fichier ${filePath} récupéré. SHA: ${currentFileSha}. Nombre de tips: ${tipsData.length}`);

        // 2. Filtrer la liste pour retirer le tip avec l'ID donné
        const initialLength = tipsData.length;
        // Utilisez String() pour s'assurer que les comparaisons d'ID sont fiables,
        // car les IDs peuvent être stockés comme nombres ou chaînes.
        const updatedTips = tipsData.filter(tip => String(tip.id) !== String(tipId));
        console.log(`Tentative de suppression du tip ID: ${tipId}. Tips avant: ${initialLength}, Tips après: ${updatedTips.length}`);

        if (updatedTips.length === initialLength) {
            console.warn(`Tip avec l'ID ${tipId} non trouvé ou aucune modification effectuée.`);
            return new Response(JSON.stringify({ message: `Tip avec l'ID ${tipId} non trouvé.` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. Préparer le nouveau contenu JSON (encodé en base64)
        const newContentBase64 = Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64');

        // 4. Mettre à jour le fichier all-tips.json sur GitHub
        console.log(`Tentative de mise à jour du fichier ${filePath} sur GitHub...`);
        await octokit.repos.createOrUpdateFileContents({
            owner: repoOwner,
            repo: repoName,
            path: filePath,
            message: `Suppression du tip: ${tipId}`,
            content: newContentBase64,
            sha: currentFileSha,
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

        // Retourner un objet Response standard du Web Fetch API
        return new Response(JSON.stringify({ message: 'Tip supprimé avec succès et déploiement déclenché.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Erreur inattendue dans la fonction delete-tip:', error);
        return new Response(JSON.stringify({ message: `Échec de la suppression du tip: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
