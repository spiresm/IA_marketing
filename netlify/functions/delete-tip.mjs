// netlify/functions/delete-tip.mjs
import { Octokit } from "@octokit/rest";
import { Buffer } from 'buffer';

export const handler = async (event, context) => {
    // Seules les requêtes DELETE sont acceptées
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed. Only DELETE requests are accepted.' }),
        };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';
    const COMMIT_MESSAGE = 'Supprimer un tip';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante pour la suppression des tips.' }),
        };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const { id } = JSON.parse(event.body); // L'ID du tip à supprimer

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'L\'ID du tip est manquant.' }),
            };
        }

        // 1. Obtenir le contenu actuel du fichier et son SHA
        let currentFile;
        try {
            const { data } = await octokit.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            currentFile = data;
        } catch (readError) {
            if (readError.status === 404) {
                // Le fichier n'existe pas, donc il n'y a rien à supprimer
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Le fichier des tips n\'existe pas encore, rien à supprimer.' }),
                };
            }
            throw readError; // Renvoyer d'autres erreurs de lecture
        }

        const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf8');
        let tips = JSON.parse(currentContent);

        // 2. Filtrer le tip à supprimer
        const initialLength = tips.length;
        tips = tips.filter(tip => tip.id !== id);

        if (tips.length === initialLength) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Tip non trouvé ou déjà supprimé.' }),
            };
        }

        // 3. Encoder le nouveau contenu et le mettre à jour sur GitHub
        const updatedContent = Buffer.from(JSON.stringify(tips, null, 2)).toString('base64');

        await octokit.repos.updateFile({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: COMMIT_MESSAGE,
            content: updatedContent,
            sha: currentFile.sha, // Important pour éviter les conflits
            branch: 'main', // Assurez-vous que c'est la bonne branche
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ message: 'Tip supprimé avec succès!', id: id }),
        };

    } catch (error) {
        console.error('Erreur lors de la suppression du tip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur lors de la suppression du tip: ${error.message}` }),
        };
    }
};
