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
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; // Assure-toi que ce chemin est correct

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
        console.log(`📡 get-tips: Tentative de récupération du fichier: ${TIPS_FILE_PATH} depuis ${OWNER}/${REPO}`);
        const { data } = await octokit.rest.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            ref: 'main', // Vérifie que c'est bien ta branche principale
        });

        console.log('✅ get-tips: Fichier récupéré de GitHub.');
        const contentBase64 = data.content;
        console.log(`📡 get-tips: Longueur du contenu encodé en base64 reçu: ${contentBase64 ? contentBase64.length : 'N/A'}`);

        // Décoder le contenu Base64 en chaîne UTF-8
        const content = Buffer.from(contentBase64, 'base64').toString('utf8');
        console.log(`📡 get-tips: Longueur du contenu décodé: ${content ? content.length : 'N/A'}`);
        // Log le début du contenu décodé pour voir si ce n'est pas vide ou corrompu au début
        // Attention: ne pas logger le contenu entier si le fichier est très grand pour éviter de saturer les logs Netlify.
        // console.log('📡 get-tips: Contenu décodé (début):', content.substring(0, 500)); 
        
        const tips = JSON.parse(content);
        console.log(`✅ get-tips: JSON parsé avec succès. ${tips.length} tips trouvés.`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Essentiel pour les requêtes CORS
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(tips),
        };
    } catch (error) {
        console.error('❌ Erreur lors de la récupération ou du parsing des tips:', error);

        if (error instanceof SyntaxError) {
            // Cette erreur indique que le JSON.parse a échoué.
            // Cela arrive si le contenu reçu de GitHub est vide, incomplet ou malformé.
            console.error('⚠️ get-tips: Erreur de parsing JSON. Le contenu reçu était probablement incomplet ou mal formé au moment de la lecture.');
            return {
                statusCode: 500, // Une erreur de parsing indique un problème sur le serveur.
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, message: `Erreur interne du serveur: Problème de lecture du fichier tips. (${error.message})` }),
            };
        } else if (error.status === 404) {
            // Le fichier all-tips.json n'existe pas du tout sur GitHub.
            console.log(`✅ get-tips: Le fichier ${TIPS_FILE_PATH} n'existe pas sur GitHub. Retourne un tableau vide.`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify([]), // Retourne un tableau vide si le fichier n'est pas trouvé
            };
        }
        
        // Pour toutes les autres erreurs non gérées spécifiquement
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
