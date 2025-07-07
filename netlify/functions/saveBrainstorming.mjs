// netlify/functions/saveBrainstorming.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRAINSTORM_FILE_PATH = process.env.BRAINSTORM_FILE_PATH || 'data/all-brainstormings.json'; // Chemin du fichier JSON

    // Vérification initiale des variables d'environnement
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Erreur de configuration: GITHUB_TOKEN, OWNER, ou REPO manquant.');
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: 'Configuration GitHub manquante (token, owner ou repo).' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    const method = event.httpMethod;
    const brainstormIdToDelete = event.queryStringParameters.id; // Pour la suppression (DELETE)

    try {
        // --- Récupérer le contenu actuel du fichier ---
        let sha = null;
        let brainstormings = []; // Initialise un tableau vide par défaut

        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: BRAINSTORM_FILE_PATH,
                ref: 'main', // Ou la branche pertinente
            });
            sha = data.sha; // SHASum du fichier actuel, nécessaire pour les mises à jour

            const content = Buffer.from(data.content, 'base64').toString('utf8');
            
            // NOUVEAU: Gérer l'erreur de parsing si le fichier est vide ou corrompu
            try {
                brainstormings = JSON.parse(content);
                // S'assurer que le contenu parsé est bien un tableau, sinon le réinitialiser
                if (!Array.isArray(brainstormings)) {
                    console.warn(`Le fichier ${BRAINSTORM_FILE_PATH} contient du JSON non-tableau. Réinitialisation à un tableau vide.`);
                    brainstormings = [];
                }
            } catch (parseError) {
                console.warn(`Le fichier ${BRAINSTORM_FILE_PATH} contient du JSON invalide ou est vide. Retourne un tableau vide pour la manipulation.`, parseError.message);
                brainstormings = []; // En cas d'erreur de parsing, on part d'un tableau vide
            }

        } catch (error) {
            // Gérer le cas où le fichier n'existe pas (404) : on commence avec un tableau vide
            if (error.status === 404) {
                console.info(`Fichier ${BRAINSTORM_FILE_PATH} non trouvé. Il sera créé lors de la sauvegarde.`);
                // `brainstormings` reste un tableau vide, et `sha` reste null
            } else {
                // Rejeter les autres erreurs de lecture (problèmes de permissions, réseau, etc.)
                console.error(`Erreur inattendue lors de la lecture du fichier ${BRAINSTORM_FILE_PATH}:`, error);
                throw error; 
            }
        }

        let newContent;
        let commitMessage;

        if (method === 'POST') {
            const newBrainstorm = JSON.parse(event.body); // Le corps de la requête contient le brainstorming à ajouter/mettre à jour
            const existingIndex = brainstormings.findIndex(b => b.id === newBrainstorm.id);

            if (existingIndex !== -1) {
                // Mise à jour d'un brainstorming existant
                brainstormings[existingIndex] = newBrainstorm;
                commitMessage = `Mise à jour du brainstorming "${newBrainstorm.name}" (${newBrainstorm.id})`;
            } else {
                // Ajout d'un nouveau brainstorming
                brainstormings.push(newBrainstorm);
                commitMessage = `Ajout du nouveau brainstorming "${newBrainstorm.name}" (${newBrainstorm.id})`;
            }
            newContent = JSON.stringify(brainstormings, null, 2); // Formatage JSON lisible
        } else if (method === 'DELETE') {
            if (!brainstormIdToDelete) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: 'ID du brainstorming manquant pour la suppression.' }),
                };
            }
            const initialLength = brainstormings.length;
            brainstormings = brainstormings.filter(b => b.id !== brainstormIdToDelete);
            
            if (brainstormings.length === initialLength) {
                return {
                    statusCode: 404,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: `Brainstorming avec l'ID ${brainstormIdToDelete} non trouvé pour suppression.` }),
                };
            }
            newContent = JSON.stringify(brainstormings, null, 2);
            commitMessage = `Suppression du brainstorming avec l'ID ${brainstormIdToDelete}`;
        } else if (method === 'OPTIONS') { // Gérer les requêtes preflight CORS
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: "OK", // Le corps n'est pas vraiment utilisé pour les OPTIONS
            };
        } else {
            return {
                statusCode: 405,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: 'Méthode non autorisée.' }),
            };
        }

        // --- Mettre à jour le fichier sur GitHub ---
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: BRAINSTORM_FILE_PATH,
            message: commitMessage,
            content: Buffer.from(newContent).toString('base64'),
            sha: sha, // Fournir le SHA est crucial pour les mises à jour existantes. Sera null pour la première création.
            branch: 'main', // Assurez-vous que c'est la bonne branche
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: newContent, // Renvoie le nouveau contenu à jour
        };
    } catch (error) {
        console.error('Erreur générale dans saveBrainstorming:', error);
        // Tente de renvoyer un message d'erreur plus utile au client
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: `Erreur interne du serveur lors de la sauvegarde: ${error.message || error}` }),
        };
    }
}
