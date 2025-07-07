// netlify/functions/getBrainstormings.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRAINSTORM_FILE_PATH = process.env.BRAINSTORM_FILE_PATH || 'data/all-brainstormings.json';

    // Vérification des variables d'environnement cruciales
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('Erreur de configuration: GITHUB_TOKEN, OWNER, ou REPO manquant.');
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" }, // Important pour voir l'erreur côté client
            body: JSON.stringify({ message: 'Configuration GitHub manquante (token, owner ou repo).' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: BRAINSTORM_FILE_PATH,
            ref: 'main', // Assurez-vous que c'est la bonne branche
        });

        // Décode le contenu base64
        const decodedContent = Buffer.from(data.content, 'base64').toString('utf8');
        
        let brainstormings = [];
        try {
            // Tente de parser le contenu. Si c'est vide ou invalide, cela catchera l'erreur.
            brainstormings = JSON.parse(decodedContent);
        } catch (parseError) {
            console.warn(`Le fichier ${BRAINSTORM_FILE_PATH} contient du JSON invalide ou est vide. Retourne un tableau vide.`, parseError);
            // Si le JSON est invalide ou vide, on initialise avec un tableau vide
            brainstormings = []; 
        }

        // Assurez-vous que 'brainstormings' est bien un tableau après le parsing (ou l'initialisation)
        if (!Array.isArray(brainstormings)) {
            console.warn(`Le contenu parsé du fichier ${BRAINSTORM_FILE_PATH} n'est pas un tableau. Réinitialisation à un tableau vide.`);
            brainstormings = [];
        }

        // Trier les brainstormings par date, du plus récent au plus ancien
        brainstormings.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE", // S'assurer que toutes les méthodes nécessaires sont listées
                "Access-Control-Allow-Headers": "Content-Type" // Permet d'envoyer Content-Type dans la requête
            },
            body: JSON.stringify(brainstormings),
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des brainstormings (catch principal):', error);
        
        // Gérer spécifiquement l'erreur 404 du fichier non trouvé sur GitHub
        if (error.status === 404) {
            console.warn(`Fichier ${BRAINSTORM_FILE_PATH} non trouvé sur GitHub. Retourne un tableau vide.`);
            return {
                statusCode: 200, // Important: 200 OK car ce n'est pas une erreur côté client
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify([]), // Retourne un tableau vide pour que le frontend n'affiche rien
            };
        }
        
        // Pour toutes les autres erreurs (ex: token invalide, repo non accessible, etc.)
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: `Erreur interne du serveur lors de la récupération des brainstormings: ${error.message}` }),
        };
    }
}
