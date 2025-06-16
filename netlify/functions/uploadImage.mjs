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

    // --- Ajout des console.log pour le débogage ---
    console.log("Received event body length:", event.body ? event.body.length : 'null');
    console.log("Received event body (first 200 chars):", event.body ? event.body.substring(0, 200) : 'null');
    // --- Fin des console.log ---

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error("Configuration de l'API GitHub manquante (token, owner, repo).");
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Configuration de l\'API GitHub manquante.' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fileName;
    let fileBase64; // <-- CORRECTION ICI : Utilisez 'fileBase64' pour correspondre au frontend
    try {
        const body = JSON.parse(event.body);
        // --- Ajout des console.log pour le débogage ---
        console.log("Parsed body object:", body);
        // --- Fin des console.log ---
        fileName = body.fileName;
        fileBase64 = body.fileBase64; // <-- CORRECTION ICI : Récupérez 'fileBase64'
    } catch (e) {
        console.error("Erreur de parsing JSON du body de la requête:", e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide.' }) };
    }

    // La validation utilise la variable corrigée
    if (!fileName || !fileBase64) { // <-- CORRECTION ICI : Utilisez 'fileBase64'
        console.error(`Validation échouée: fileName=${fileName}, fileBase64=${fileBase64 ? 'présent' : 'absent'}`); // <-- CORRECTION ICI pour les logs
        return { statusCode: 400, body: JSON.stringify({ message: 'Nom de fichier ou contenu de l\'image manquant.' }) };
    }

    const filePath = `${UPLOAD_DIR}${fileName}`;
    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        let sha = undefined;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: filePath,
                ref: 'main',
            });
            sha = data.sha;
            console.log(`Fichier existant trouvé: ${filePath}, SHA: ${sha}`);
        } catch (error) {
            if (error.status !== 404) {
                console.error(`Erreur lors de la récupération du fichier ${filePath}:`, error);
                throw error;
            }
            console.log(`Fichier non trouvé: ${filePath}, sera créé.`);
        }

        const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: filePath,
            message: `Upload de ${fileName}`,
            content: fileBase64, // <-- CORRECTION ICI : Utilisez 'fileBase64'
            sha: sha,
            branch: 'main',
        });

        const imageUrl = uploadResponse.data.content.download_url;
        console.log(`Fichier ${fileName} uploadé sur GitHub. URL: ${imageUrl}`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({
                message: `Fichier ${fileName} uploadé avec succès sur GitHub !`,
                url: imageUrl
            }),
        };

    } catch (error) {
        console.error('Erreur lors de l\'upload de l\'image vers GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
}
