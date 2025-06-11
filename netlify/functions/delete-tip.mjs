// netlify/functions/delete-tip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event, context) => {
    // --- NOUVEAUX LOGS DE DÉBOGAGE AU DÉBUT ---
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body); // Pour voir l'ID du tip envoyé
    // --- FIN NOUVEAUX LOGS DE DÉBOGAGE ---

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
        console.error("Erreur: Variables d'environnement GitHub manquantes."); // Log d'erreur
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante pour la suppression des tips.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        const { id } = JSON.parse(event.body); // L'ID du tip à supprimer

        console.log("ID du tip à supprimer reçu:", id); // Log de l'ID

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'L\'ID du tip est manquant.' }),
            };
        }

        let currentFile;
        try {
            console.log(`Tentative de lecture du fichier des tips: ${TIPS_FILE_PATH}`); // Log de lecture
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            currentFile = data;
            console.log("Fichier des tips lu avec succès."); // Log de succès de lecture
        } catch (readError) {
            console.error("Erreur lors de la lecture du fichier des tips:", readError.status, readError.message); // Log détaillé de l'erreur de lecture
            if (readError.status === 404) {
                // Cette 404 signifie que le fichier entier n'existe pas.
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Le fichier des tips n\'existe pas encore, rien à supprimer.' }),
                };
            }
            throw readError; // Relance l'erreur si ce n'est pas un 404
        }

        const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf8');
        let tips = JSON.parse(currentContent);

        console.log("Nombre de tips avant suppression:", tips.length); // Log du nombre initial
        console.log("Contenu actuel des tips (IDs seulement):", tips.map(tip => tip.id)); // Log des IDs

        const initialLength = tips.length;
        tips = tips.filter(tip => String(tip.id) !== String(id)); // Assurer la comparaison de type

        console.log("Nombre de tips après suppression:", tips.length); // Log du nombre après filtre

        if (tips.length === initialLength) {
            // Cette 404 signifie que le tip avec l'ID donné n'a pas été trouvé.
            console.warn(`Tip avec l'ID ${id} non trouvé pour suppression.`); // Log d'avertissement
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Tip non trouvé ou déjà supprimé.' }),
            };
        }

        const updatedContent = Buffer.from(JSON.stringify(tips, null, 2)).toString('base64');

        console.log("Tentative de mise à jour du fichier des tips sur GitHub."); // Log avant écriture
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: COMMIT_MESSAGE,
            content: updatedContent,
            sha: currentFile.sha,
            branch: 'main',
        });
        console.log("Fichier des tips mis à jour avec succès sur GitHub."); // Log de succès écriture

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
        console.error('Erreur inattendue lors de la suppression du tip:', error); // Log d'erreur détaillé
        // S'assurer que le message d'erreur est bien formaté
        const errorMessage = error.message || 'Une erreur inconnue est survenue.';
        const statusCode = error.status || 500; // Utiliser le statut de l'erreur si disponible

        return {
            statusCode: statusCode,
            body: JSON.stringify({ message: `Erreur lors de la suppression du tip: ${statusCode} - ${errorMessage}` }),
        };
    } finally {
        console.log("------------------- Fin de l'exécution de delete-tip.mjs -------------------"); // Log de fin
    }
};
