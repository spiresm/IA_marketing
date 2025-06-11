// netlify/functions/uploadImage.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer'; // Nécessaire pour les opérations de fichiers en base64

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/'; // Dossier où les images seront stockées dans le repo GitHub

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fileName;
    let fileContentBase64;
    try {
        const body = JSON.parse(event.body);
        fileName = body.fileName;
        fileContentBase64 = body.fileContent; // Contenu du fichier en base64
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    if (!fileName || !fileContentBase64) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Nom de fichier ou contenu manquant.' }) };
    }

    const filePath = `${UPLOAD_DIR}${fileName}`;
    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // Vérifier si le fichier existe déjà pour obtenir son SHA si nécessaire (pour updateFile)
        let sha = undefined;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: filePath,
                ref: 'main',
            });
            sha = data.sha;
        } catch (error) {
            // Si le fichier n'existe pas (404), c'est normal, sha reste undefined pour createOrUpdateFileContents
            if (error.status !== 404) {
                throw error; // Lancer d'autres erreurs inattendues
            }
        }

        // Créer ou mettre à jour le fichier
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            message: `Upload de ${fileName}`,
            content: fileContentBase64, // Le contenu est déjà en base64
            sha: sha, // SHA est nécessaire si vous mettez à jour un fichier existant
            branch: 'main',
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // IMPORTANT pour le CORS
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ message: `Fichier ${fileName} uploadé avec succès sur GitHub !` }),
        };

    } catch (error) {
        console.error('Erreur lors de l\'upload de l\'image:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
