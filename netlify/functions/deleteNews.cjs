// netlify/functions/deleteNews.cjs
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'spiresm'; // <-- REMPLACEZ PAR VOTRE NOM D'UTILISATEUR
const REPO_NAME = 'IA_marketing'; // <-- REMPLACEZ PAR LE NOM DE VOTRE DÉPÔT
const FILE_PATH = 'news-data.json';
const BRANCH = 'main'; // Ou 'master' selon votre branche principale

exports.handler = async (event, context) => {
    console.log("--- deleteNews function invoked ---");
    console.log("HTTP Method:", event.httpMethod);
    console.log("Request body (raw):", event.body ? event.body.substring(0, 200) + '...' : 'empty');

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

    let timestampToDelete;

    try {
        const body = JSON.parse(event.body);
        if (typeof body.timestamp === 'string') {
            timestampToDelete = body.timestamp;
            console.log(`Parsed timestampToDelete (string): ${timestampToDelete}`);
        } else {
            console.error("DELETE action: Missing or invalid timestamp in payload. Payload:", body);
            throw new Error('Invalid input for delete action: expected a string timestamp.');
        }
    } catch (error) {
        console.error('Error parsing request body or invalid delete payload:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request payload for delete action.', details: error.message }),
        };
    }

    let currentFileContent = [];
    let fileSha = null;

    try {
        const getContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
        const responseGet = await fetch(getContentsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.com.v3+json',
                'User-Agent': 'Netlify-Function'
            },
        });

        if (responseGet.ok) {
            const fileData = await responseGet.json();
            fileSha = fileData.sha;
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            
            try {
                const parsedContent = JSON.parse(content);
                if (Array.isArray(parsedContent)) {
                    currentFileContent = parsedContent;
                } else if (typeof parsedContent === 'object' && parsedContent !== null) {
                    currentFileContent = Object.values(parsedContent);
                    console.warn(`Existing ${FILE_PATH} was an object, converted to array for processing.`);
                } else {
                    console.warn(`Existing ${FILE_PATH} content was not an array or object, initializing empty array.`);
                    currentFileContent = [];
                }
            } catch (parseError) {
                console.error(`Error parsing JSON from existing ${FILE_PATH}:`, parseError);
                currentFileContent = [];
            }
            console.log(`Successfully retrieved existing ${FILE_PATH}. Items: ${currentFileContent.length}`);
        } else if (responseGet.status === 404) {
            console.log(`${FILE_PATH} not found. Cannot delete from non-existent file.`);
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'News file not found, nothing to delete.' }),
            };
        } else {
            const errorText = await responseGet.text();
            throw new Error(`GitHub getContents failed: ${responseGet.status} ${responseGet.statusText} - ${errorText}`);
        }

    } catch (error) {
        console.error('Failed to retrieve news file from GitHub for deletion:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve news data for deletion.', details: error.message }),
        };
    }

    let updatedNewsArray = [...currentFileContent];

    const initialLength = updatedNewsArray.length;
    const payloadTimestampMs = new Date(timestampToDelete).getTime(); 
    
    updatedNewsArray = updatedNewsArray.filter(item => {
        const itemTimestampMs = new Date(item.timestamp || '').getTime();
        // Log pour le débogage de la comparaison
        console.log(`Comparing item: "${item.title}" (ts: ${item.timestamp || 'N/A'}, ms: ${itemTimestampMs}) with delete_ts: ${timestampToDelete} (ms: ${payloadTimestampMs}). Match: ${itemTimestampMs === payloadTimestampMs}`);
        
        return itemTimestampMs !== payloadTimestampMs;
    });

    if (updatedNewsArray.length < initialLength) {
        console.log(`Item with timestamp ${timestampToDelete} successfully deleted.`);
    } else {
        console.warn(`Item with timestamp ${timestampToDelete} not found in array for deletion. No item removed.`);
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Item not found in news feed for deletion.' }),
        };
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const beforeFilterCount = updatedNewsArray.length;
    updatedNewsArray = updatedNewsArray.filter(item => {
        return !item.timestamp || new Date(item.timestamp) > fortyEightHoursAgo;
    });
    console.log(`Filtered out ${beforeFilterCount - updatedNewsArray.length} old items after deletion. Remaining: ${updatedNewsArray.length}`);

    const MAX_NEWS_ITEMS = 20;
    if (updatedNewsArray.length > MAX_NEWS_ITEMS) {
        updatedNewsArray = updatedNewsArray.slice(0, MAX_NEWS_ITEMS);
        console.log(`Trimmed news list to ${MAX_NEWS_ITEMS} items.`);
    }
    
    updatedNewsArray.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));


    try {
        const updateContentsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        
        const payload = {
            message: `News feed update (delete) [skip ci]`,
            content: Buffer.from(JSON.stringify(updatedNewsArray, null, 2)).toString('base64'),
            sha: fileSha,
            branch: BRANCH,
        };

        const responseUpdate = await fetch(updateContentsUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.com.v3+json',
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
        console.error('Failed to save news to GitHub during deletion:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
