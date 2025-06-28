// netlify/functions/saveNews.cjs
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'spiresm'; // Utilisez la valeur exacte de votre REPO_OWNER
const REPO_NAME = 'IA_marketing'; // Utilisez la valeur exacte de votre REPO_NAME
const FILE_PATH = 'news-data.json';
const BRANCH = 'main'; // Assurez-vous que c'est la bonne branche (main ou master)

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
        if (typeof incomingNewsItem !== 'object' || incomingNewsItem === null || Array.isArray(incomingNewsItem)) {
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
                'User-Agent': 'Netlify-Function'
            },
        });

        if (responseGet.ok) {
            const fileData = await responseGet.json();
            currentSha = fileData.sha;
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            
            try {
                const parsedContent = JSON.parse(content);
                // S'assurer que le contenu existant est bien un tableau
                if (Array.isArray(parsedContent)) {
                    existingNews = parsedContent;
                } else {
                    // Si ce n'est pas un tableau (comme l'objet {0: ..., 1: ...}), tentez de le convertir
                    existingNews = Object.values(parsedContent);
                    console.warn(`Existing ${FILE_PATH} was an object, converted to array.`);
                }
            } catch (parseError) {
                console.error(`Error parsing existing ${FILE_PATH}:`, parseError);
                // Si le parsing échoue, réinitialiser existingNews à un tableau vide
                existingNews = [];
            }
            console.log(`Existing ${FILE_PATH} found. SHA: ${currentSha}`);

        } else if (responseGet.status === 404) {
            console.log(`${FILE_PATH} not found, will create it.`);
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
            message: `Update news feed via admin panel [skip ci]`,
            content: Buffer.from(JSON.stringify(existingNews, null, 2)).toString('base64'), // S'assurer que JSON.stringify produit un ARRAY
            sha: currentSha,
            branch: BRANCH,
        };

        const responseUpdate = await fetch(updateContentsUrl, {
            method: 'PUT',
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
