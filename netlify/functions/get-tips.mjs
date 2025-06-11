// netlify/functions/get-tips.mjs
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import fetch from 'node-fetch'; // <--- NOUVEL IMPORT NÉCESSAIRE

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event, context) => {
    console.log("--- Début de l'exécution de get-tips ---");
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('❌ get-tips: Configuration de l\'API GitHub (TOKEN, OWNER, REPO) manquante.');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Configuration de l\'API GitHub manquante. Contactez l\'administrateur.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        console.log(`📡 get-tips: Tentative de récupération des métadonnées du fichier: ${TIPS_FILE_PATH} depuis ${OWNER}/${REPO}`);
        const response = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main',
        });

        const fileMetadata = response.data; // Ceci contient les infos sur le fichier, pas le contenu s'il est trop gros

        console.log('✅ get-tips: Métadonnées du fichier récupérées de GitHub.');
        console.log('📡 get-tips: Réponse complète de GitHub (métadonnées):', JSON.stringify(fileMetadata, null, 2)); // Gardons ce log pour référence

        // Vérifier si le contenu est directement présent ou si nous devons utiliser download_url
        let content;
        if (fileMetadata.content && fileMetadata.encoding === 'base64') {
            console.log('📡 get-tips: Contenu directement présent (taille < 1MB).');
            content = Buffer.from(fileMetadata.content, 'base64').toString('utf8');
        } else if (fileMetadata.download_url) {
            console.log(`📡 get-tips: Contenu non direct (taille >= 1MB ou encodage "none"). Utilisation de download_url: ${fileMetadata.download_url}`);
            // Faire une nouvelle requête pour récupérer le contenu brut
            const rawResponse = await fetch(fileMetadata.download_url);
            if (!rawResponse.ok) {
                throw new Error(`Failed to download raw content: ${rawResponse.statusText}`);
            }
            content = await rawResponse.text(); // Le contenu est directement le texte du fichier
            console.log(`✅ get-tips: Contenu téléchargé via download_url. Longueur: ${content.length}`);
        } else {
            // Cas inattendu : ni content ni download_url
            console.error('❌ get-tips: Réponse GitHub inattendue, ni content ni download_url disponibles.');
            throw new Error('Impossible de récupérer le contenu du fichier tips: Format de réponse GitHub inattendu.');
        }

        console.log(`📡 get-tips: Longueur du contenu décodé (final): ${content ? content.length : 'N/A'}`);
        // console.log('📡 get-tips: Contenu décodé (début):', content.substring(0, 500)); // Décommentez pour un aperçu

        const tips = JSON.parse(content);
        console.log(`✅ get-tips: JSON parsé avec succès. ${tips.length} tips trouvés.`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(tips),
        };
    } catch (error) {
        console.error('❌ Erreur lors de la récupération ou du parsing des tips:', error);

        if (error instanceof SyntaxError) {
            console.error('⚠️ get-tips: Erreur de parsing JSON. Le contenu reçu était probablement incomplet ou mal formé au moment de la lecture.');
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, message: `Erreur interne du serveur: Problème de lecture du fichier tips. (${error.message})` }),
            };
        } else if (error.status === 404) {
            console.log(`✅ get-tips: Le fichier ${TIPS_FILE_PATH} n'existe pas sur GitHub. Retourne un tableau vide.`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify([]),
            };
        }
        
        console.error('❌ get-tips: Erreur inattendue:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur: ${error.message}` }),
        };
    } finally {
        console.log("--- Fin de l'exécution de get-tips ---");
    }
};
