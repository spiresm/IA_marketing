// netlify/functions/saveNews.cjs
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'spiresm'; // <-- REMPLACEZ PAR VOTRE NOM D'UTILISATEUR
const REPO_NAME = 'IA_marketing'; // <-- REMPLACEZ PAR LE NOM DE VOTRE DÉPÔT
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

    let actionType = 'add'; // 'add' ou 'delete'
    let incomingData;
    let indexToDelete = -1;

    try {
        const body = JSON.parse(event.body);
        if (body.action === 'delete' && typeof body.index === 'number') {
            actionType = 'delete';
            indexToDelete = body.index;
            console.log(`Action: Delete item at index ${indexToDelete}`);
        } else {
            incomingData = body; // Un nouvel article à ajouter
            if (typeof incomingData !== 'object' || incomingData === null || Array.isArray(incomingData)) {
                throw new Error('Invalid input: body must be a single news item object for add action.');
            }
            if (!incomingData.title || !incomingData.pole || !incomingData.color || !incomingData.collaborateur) { // Assurez-vous que collaborateur est là
                throw new Error('Missing required fields: title, pole, collaborateur, and color are mandatory for add action.');
            }
            console.log("Action: Add new item.");
        }
    } catch (error) {
        console.error('Invalid JSON body or missing action/index:', error);
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
                if (Array.isArray(parsedContent)) {
                    existingNews = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    existingNews = Object.values(parsedContent);
                    console.warn(`Existing ${FILE_PATH} was an object, converted to array.`);
                } else {
                    existingNews = []; // Fallback si le contenu est invalide
                }
            } catch (parseError) {
                console.error(`Error parsing existing ${FILE_PATH}:`, parseError);
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

    // --- LOGIQUE DE GESTION DES ARTICLES (AJOUT, SUPPRESSION, VIEILLISSEMENT) ---
    let updatedNews = [];

    // 1. Filtrer les articles de plus de 48 heures (2 jours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    updatedNews = existingNews.filter(item => {
        // Garder les articles qui n'ont pas de timestamp (anciens) ou qui sont plus récents que 48h
        return !item.timestamp || new Date(item.timestamp) > fortyEightHoursAgo;
    });
    console.log(`Filtered out old items. Remaining: ${updatedNews.length}`);

    // 2. Traiter l'action demandée
    if (actionType === 'add') {
        updatedNews.unshift({
            title: incomingData.title,
            pole: incomingData.pole,
            collaborateur: incomingData.collaborateur,
            color: incomingData.color,
            timestamp: new Date().toISOString() // Ajoute un horodatage pour le tri et la durée de vie
        });
        console.log("New item added.");
    } else if (actionType === 'delete') {
        if (indexToDelete >= 0 && indexToDelete < updatedNews.length) {
            updatedNews.splice(indexToDelete, 1);
            console.log(`Item at index ${indexToDelete} deleted.`);
        } else {
            console.warn(`Attempted to delete invalid index: ${indexToDelete}`);
        }
    }

    // 3. Limiter le nombre total d'articles (après ajout/suppression et vieillissement)
    const MAX_NEWS_ITEMS = 20; // Maximum d'articles à conserver dans le fichier
    if (updatedNews.length > MAX_NEWS_ITEMS) {
        updatedNews = updatedNews.slice(0, MAX_NEWS_ITEMS);
        console.log(`Trimmed news list to ${MAX_NEWS_ITEMS} items.`);
    }

    // --- Sauvegarder le fichier mis à jour sur GitHub ---
    try {
        const updateContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const payload = {
            message: `Update news feed (action: ${actionType}) [skip ci]`, // Message plus descriptif
            content: Buffer.from(JSON.stringify(updatedNews, null, 2)).toString('base64'),
            sha: currentSha, // SHA reste celui du fichier d'origine, même si le contenu change
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
            body: JSON.stringify({ message: 'Flux mis à jour et pushé sur GitHub ! Netlify va redéployer.' }),
        };

    } catch (error) {
        console.error('Error creating/updating file on GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
