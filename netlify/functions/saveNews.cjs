// netlify/functions/saveNews.cjs
const { Octokit } = require("@octokit/rest");
const path = require('path');

// Récupérer le token depuis les variables d'environnement Netlify
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Informations sur votre dépôt GitHub
const REPO_OWNER = 'VOTRE_NOM_D_UTILISATEUR_GITHUB'; // <-- REMPLACEZ PAR VOTRE NOM D'UTILISATEUR
const REPO_NAME = 'NOM_DE_VOTRE_DEPOT'; // <-- REMPLACEZ PAR LE NOM DE VOTRE DÉPÔT
const FILE_PATH = 'news-data.json'; // Le nom du fichier JSON qui contiendra les articles

const octokit = new Octokit({
    auth: GITHUB_TOKEN,
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN not set in Netlify environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Server error: GitHub token not configured.' }),
        };
    }

    let incomingNewsItem;
    try {
        incomingNewsItem = JSON.parse(event.body);
        if (typeof incomingNewsItem !== 'object' || incomingNewsItem === null) {
            throw new Error('Invalid input: body must be a single news item object.');
        }
        if (!incomingNewsItem.title || !incomingNewsItem.pole || !incomingNewsItem.color) {
            throw new Error('Missing required fields: title, pole, and color are mandatory.');
        }

    } catch (error) {
        console.error('Invalid JSON body:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON format or data structure.', details: error.message }),
        };
    }

    let existingNews = [];
    let currentSha = null; // Initialise le SHA à null

    try {
        // Tenter de récupérer le SHA du fichier existant et son contenu
        // CORRECTION ICI : Utilisation de octokit.rest.repos.getContents
        const { data: fileData } = await octokit.rest.repos.getContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });
        currentSha = fileData.sha; // Récupère le SHA
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        existingNews = JSON.parse(content);
        if (!Array.isArray(existingNews)) {
            existingNews = [];
        }
        console.log(`Existing ${FILE_PATH} found. SHA: ${currentSha}`);

    } catch (error) {
        if (error.status === 404) {
            console.log(`${FILE_PATH} not found, will create it.`);
            // currentSha reste null, ce qui est correct pour la création
        } else {
            console.error('Error getting existing file contents:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to retrieve existing news file from GitHub.', details: error.message }),
            };
        }
    }

    // On ajoute le nouvel article en haut de la liste (le plus récent en premier)
    existingNews.unshift({
        title: incomingNewsItem.title,
        pole: incomingNewsItem.pole,
        collaborateur: incomingNewsItem.collaborateur, // Assurez-vous d'envoyer collaborateur depuis le front
        color: incomingNewsItem.color,
        timestamp: new Date().toISOString()
    });

    // Limitez le nombre d'articles dans le flux (ex: 20 derniers articles)
    const MAX_NEWS_ITEMS = 20;
    if (existingNews.length > MAX_NEWS_ITEMS) {
        existingNews = existingNews.slice(0, MAX_NEWS_ITEMS);
    }

    try {
        // Mettre à jour (ou créer) le fichier
        // CORRECTION ICI : Utilisation de octokit.rest.repos.createOrUpdateFileContents
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `Update news feed via admin panel [skip ci]`, // [skip ci] pour éviter une boucle de build infinie
            content: Buffer.from(JSON.stringify(existingNews, null, 2)).toString('base64'),
            sha: currentSha, // Fournir le SHA (null pour la création, valeur réelle pour la mise à jour)
            branch: 'main', // Ou 'master' selon votre branche principale
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Actualité ajoutée et pushée sur GitHub ! Netlify va redéployer.' }),
        };

    } catch (error) {
        console.error('Error interacting with GitHub API on create/update:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
