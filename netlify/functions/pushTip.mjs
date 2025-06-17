// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Gardez si nécessaire pour vos opérations de fichiers

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // Variables d'environnement pour l'authentification GitHub
    // Assurez-vous qu'elles sont configurées dans vos paramètres Netlify
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    // Chemin vers le fichier JSON dans votre dépôt GitHub
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; 

    // Vérification de la configuration minimale
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante. Veuillez définir GITHUB_TOKEN, GITHUB_OWNER et GITHUB_REPO dans vos variables d\'environnement Netlify.' }),
        };
    }

    // Autorise uniquement les requêtes POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let newTip;
    try {
        // Parse le corps de la requête (qui doit être un objet JSON)
        newTip = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Le corps doit être un JSON valide.' }) };
    }

    // Initialisation de l'instance Octokit avec le jeton d'authentification
    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // 1. Tenter de récupérer le contenu actuel du fichier de tips
        let fileData;
        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main', // Ou la branche que vous utilisez, par exemple 'master'
            });
            fileData = response.data;
        } catch (error) {
            if (error.status === 404) {
                // Si le fichier n'existe pas (404 Not Found), on commence avec un tableau JSON vide
                console.log(`Le fichier ${TIPS_FILE_PATH} n'existe pas, création d'un nouveau fichier.`);
                fileData = { content: Buffer.from(JSON.stringify([], null, 2)).toString('base64'), sha: undefined };
            } else {
                // Relancer les autres erreurs liées à getContent
                throw error; 
            }
        }

        // Décoder le contenu du fichier (il est encodé en base64 par l'API GitHub)
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const existingTips = JSON.parse(content);

        // 2. Ajouter le nouveau tip à la liste existante
        // La fonction ajoute un 'id' simple basé sur le timestamp actuel.
        // Le `...newTip` ajoute toutes les propriétés envoyées par le formulaire (auteur, titre, description, etc.)
        const updatedTips = [...existingTips, { id: Date.now().toString(), ...newTip }]; 

        // 3. Mettre à jour (ou créer) le fichier sur GitHub
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Ajout d'un nouveau tip par le formulaire`, // Message du commit GitHub
            content: Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64'), // Le nouveau contenu encodé
            sha: fileData.sha, // 'sha' est crucial pour la mise à jour (évite les conflits)
            branch: 'main' // Ou la branche cible
        });

        // Réponse en cas de succès
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip ajouté avec succès !', tip: newTip }),
        };

    } catch (error) {
        // Gestion des erreurs générales lors de l'interaction avec GitHub
        console.error('Erreur lors de l\'ajout du tip à GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message}` }),
        };
    }
}
