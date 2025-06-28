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

    let actionType = 'add';
    let incomingData = null; // Pour les actions 'add'
    let timestampToDelete = null; // Pour les actions 'delete'

    try {
        const body = JSON.parse(event.body);
        if (body.action === 'delete' && typeof body.timestamp === 'string') {
            actionType = 'delete';
            timestampToDelete = body.timestamp;
        } else {
            // Assume 'add' action if not 'delete'
            incomingData = body;
            if (typeof incomingData !== 'object' || incomingData === null || Array.isArray(incomingData)) {
                throw new Error('Invalid input for add action: expected a single news item object.');
            }
            // IMPORTANT: Vérifier que tous les champs attendus par le front sont présents
            if (!incomingData.title || !incomingData.pole || !incomingData.collaborateur || !incomingData.color) {
                throw new Error('Missing required fields for add action: title, pole, collaborateur, color.');
            }
        }
    } catch (error) {
        console.error('Error parsing request body or invalid action:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request payload.', details: error.message }),
        };
    }

    let currentFileContent = []; // Ce sera l'array d'actualités que nous allons manipuler
    let fileSha = null; // SHA du fichier existant, nécessaire pour la mise à jour GitHub

    try {
        // --- Tenter de récupérer le contenu actuel du fichier news-data.json ---
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
            fileSha = fileData.sha; // On récupère le SHA pour la mise à jour
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            
            try {
                // Tenter de parser le contenu. Si c'est un objet (ancien format), le convertir en tableau.
                const parsedContent = JSON.parse(content);
                if (Array.isArray(parsedContent)) {
                    currentFileContent = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    currentFileContent = Object.values(parsedContent); // Convertir l'objet en tableau
                    console.warn(`Existing ${FILE_PATH} was an object, converted to array for processing.`);
                } else {
                    console.warn(`Existing ${FILE_PATH} content was not an array or object, initializing empty array.`);
                    currentFileContent = [];
                }
            } catch (parseError) {
                console.error(`Error parsing JSON from existing ${FILE_PATH}:`, parseError);
                currentFileContent = []; // En cas d'erreur de parsing, on repart d'un tableau vide
            }
            console.log(`Successfully retrieved existing ${FILE_PATH}. Items: ${currentFileContent.length}`);
        } else if (responseGet.status === 404) {
            console.log(`${FILE_PATH} not found. A new file will be created.`);
            // fileSha reste null, ce qui est correct pour la création
        } else {
            const errorText = await responseGet.text();
            throw new Error(`GitHub getContents failed: ${responseGet.status} ${responseGet.statusText} - ${errorText}`);
        }

    } catch (error) {
        console.error('Failed to retrieve news file from GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve news data.', details: error.message }),
        };
    }

    // --- MANIPULATION DES DONNÉES (AJOUT, SUPPRESSION, FILTRAGE PAR ÂGE, LIMITATION) ---
    let updatedNewsArray = [...currentFileContent]; // Crée une copie pour travailler dessus

    if (actionType === 'add') {
        // Ajoute le nouvel article en haut avec un timestamp frais
        updatedNewsArray.unshift({
            title: incomingData.title,
            pole: incomingData.pole,
            collaborateur: incomingData.collaborateur,
            color: incomingData.color,
            timestamp: new Date().toISOString()
        });
        console.log("New item added to array.");
    } else if (actionType === 'delete') {
        // Filtre pour supprimer l'article par son timestamp unique
        const initialLength = updatedNewsArray.length;
        updatedNewsArray = updatedNewsArray.filter(item => item.timestamp !== timestampToDelete);
        if (updatedNewsArray.length < initialLength) {
            console.log(`Item with timestamp ${timestampToDelete} deleted from array.`);
        } else {
            console.warn(`Item with timestamp ${timestampToDelete} not found in array for deletion.`);
        }
    }

    // Filtrer les articles de plus de 48 heures (2 jours) - APPLIQUÉ APRÈS LES OPÉRATIONS ADD/DELETE
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const beforeFilterCount = updatedNewsArray.length;
    updatedNewsArray = updatedNewsArray.filter(item => {
        return !item.timestamp || new Date(item.timestamp) > fortyEightHoursAgo;
    });
    console.log(`Filtered out ${beforeFilterCount - updatedNewsArray.length} old items. Remaining: ${updatedNewsArray.length}`);


    // Limiter le nombre total d'articles (après toutes les manipulations)
    const MAX_NEWS_ITEMS = 20; // Nombre maximum d'articles à conserver dans le fichier
    if (updatedNewsArray.length > MAX_NEWS_ITEMS) {
        updatedNewsArray = updatedNewsArray.slice(0, MAX_NEWS_ITEMS);
        console.log(`Trimmed news list to ${MAX_NEWS_ITEMS} items.`);
    }
    
    // Trier les actualités par timestamp (du plus récent au plus ancien) avant de sauvegarder
    updatedNewsArray.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));


    // --- Sauvegarder le fichier mis à jour sur GitHub ---
    try {
        const updateContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const payload = {
            message: `Update news feed (action: ${actionType}) [skip ci]`,
            content: Buffer.from(JSON.stringify(updatedNewsArray, null, 2)).toString('base64'), // Sauvegarde un tableau JSON valide
            sha: fileSha, // Le SHA de l'ancienne version, null si nouveau fichier
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
            body: JSON.stringify({ message: 'Flux mis à jour et pushé sur GitHub ! Netlify va redéployer.' }),
        };

    } catch (error) {
        console.error('Failed to save news to GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
