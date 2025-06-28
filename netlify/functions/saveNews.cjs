// netlify/functions/saveNews.cjs
const fetch = require('node-fetch'); // On réutilise node-fetch que vous avez déjà

// Récupérer le token et les infos du dépôt depuis les variables d'environnement Netlify
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'spiresm'; //
const REPO_NAME = 'IA_marketing';
const FILE_PATH = 'news-data.json';
const BRANCH = 'main'; // Ou 'master' selon votre branche principale

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
    let currentSha = null;

    try {
        // --- Récupérer le contenu existant du fichier (si il existe) ---
        const getContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
        const responseGet = await fetch(getContentsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function' // Requis par GitHub
            },
        });

        if (responseGet.ok) {
            const fileData = await responseGet.json();
            currentSha = fileData.sha;
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            existingNews = JSON.parse(content);
            if (!Array.isArray(existingNews)) {
                existingNews = [];
            }
            console.log(`Existing ${FILE_PATH} found. SHA: ${currentSha}`);
        } else if (responseGet.status === 404) {
            console.log(`${FILE_PATH} not found, will create it.`);
            // currentSha reste null, ce qui est correct pour la création
        } else {
            const errorText = await responseGet.text();
            throw new Error(`GitHub getContents failed: ${responseGet.status} ${responseGet.statusText} - ${errorText}`);
        }

    } catch (error) {
        console.error('Error retrieving existing file from GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve existing news file from GitHub.', details: error.message }),
        };
    }

    // Ajouter le nouvel article en haut de la liste
    existingNews.unshift({
        title: incomingNewsItem.title,
        pole: incomingNewsItem.pole,
        collaborateur: incomingNewsItem.collaborateur,
        color: incomingNewsItem.color,
        timestamp: new Date().toISOString()
    });

    // Limiter le nombre d'articles
    const MAX_NEWS_ITEMS = 20;
    if (existingNews.length > MAX_NEWS_ITEMS) {
        existingNews = existingNews.slice(0, MAX_NEWS_ITEMS);
    }

    try {
        // --- Mettre à jour (ou créer) le fichier sur GitHub ---
        const updateContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const payload = {
            message: `Update news feed via admin panel [skip ci]`, // [skip ci] pour éviter une boucle de build infinie
            content: Buffer.from(JSON.stringify(existingNews, null, 2)).toString('base64'),
            sha: currentSha, // Fournir le SHA pour la mise à jour, ou null pour la création
            branch: BRANCH,
        };

        const responseUpdate = await fetch(updateContentsUrl, {
            method: 'PUT', // PUT pour créer ou mettre à jour
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        if (!responseUpdate.ok) {
            const errorText = await responseUpdate.text();
            throw new Error(`GitHub updateContents failed: ${responseUpdate.status} ${responseUpdate.statusText} - ${errorText}`);
        }

        const result = await responseUpdate.json();
        console.log('GitHub API response for file update:', result);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Actualité ajoutée et pushée sur GitHub ! Netlify va redéployer.' }),
        };

    } catch (error) {
        console.error('Error creating/updating file on GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
