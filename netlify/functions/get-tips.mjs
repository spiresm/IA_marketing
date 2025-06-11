// netlify/functions/get-tips.mjs
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event, context) => {
    console.log("--- Début de l'exécution de get-tips ---");
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json';

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error('❌ get-tips: Configuration de l\'API GitHub (TOKEN, OWNER, REPO) manquante. Veuillez vérifier vos variables d\'environnement Netlify.');
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Configuration de l\'API GitHub manquante. Contactez l\'administrateur.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        console.log(`📡 get-tips: Tentative de récupération du fichier: ${TIPS_FILE_PATH} depuis <span class="math-inline">\{OWNER\}/</span>{REPO}`);
        const response = await octokit.rest.repos.getContent({ // CHANGÉ : capture la réponse complète
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main',
        });

        // --- NOUVEAU LOG CLÉ ---
        console.log('✅ get-tips: Réponse complète de GitHub (data):', JSON.stringify(response.data, null, 2));
        // --- FIN NOUVEAU LOG CLÉ ---

        const fileData = response.data; // Utilisez cette variable pour plus de clarté

        // Vérifiez si data.content existe et n'est pas vide
        if (!fileData || !fileData.content) {
            console.error('❌ get-tips: data.content est manquant ou vide dans la réponse GitHub.');
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, message: `Erreur interne du serveur: Le contenu du fichier tips n'a pas été trouvé dans la réponse de GitHub.` }),
            };
        }

        const contentBase64 = fileData.content;
        console.log(`📡 get-tips: Longueur du contenu encodé en base64 reçu: ${contentBase64.length}`); // Plus de N/A ici si le check passe

        const content = Buffer.from(contentBase64, 'base64').toString('utf8');
        console.log(`📡 get-tips: Longueur du contenu décodé: ${content.length}`); // Plus de N/A ici si le check passe
        // console.log('📡 get-tips: Contenu décodé (début):', content.substring(0, 500)); // Décommentez si vous voulez voir un extrait

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
