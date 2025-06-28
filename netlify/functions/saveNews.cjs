const { Octokit } = require("@octokit/rest");
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const REPO_OWNER = 'VOTRE_NOM_D_UTILISATEUR_GITHUB'; // <-- REMPLACEZ PAR VOTRE NOM D'UTILISATEUR
const REPO_NAME = 'NOM_DE_VOTRE_DEPOT'; // <-- REMPLACEZ PAR LE NOM DE VOTRE DÉPÔT
const FILE_PATH = 'news-data.json';

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
        // On attend un objet unique, pas un tableau
        if (typeof incomingNewsItem !== 'object' || incomingNewsItem === null) {
            throw new Error('Invalid input: body must be a single news item object.');
        }
        // Assurez-vous que les champs essentiels sont présents
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
    try {
        // Tenter de récupérer le SHA du fichier existant et son contenu
        const { data: fileData } = await octokit.repos.getContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        existingNews = JSON.parse(content);
        if (!Array.isArray(existingNews)) { // S'assurer que c'est bien un tableau
            existingNews = [];
        }
        fileData.sha; // Garder le SHA pour la mise à jour

        // On ajoute le nouvel article en haut de la liste (le plus récent en premier)
        // Limitez la taille du flux pour éviter un fichier JSON trop gros.
        existingNews.unshift({
            title: incomingNewsItem.title,
            pole: incomingNewsItem.pole,
            color: incomingNewsItem.color,
            timestamp: new Date().toISOString() // Ajoute un horodatage pour le tri ou le débogage
        });

        // Limitez le nombre d'articles dans le flux (ex: 20 derniers articles)
        const MAX_NEWS_ITEMS = 20;
        if (existingNews.length > MAX_NEWS_ITEMS) {
            existingNews = existingNews.slice(0, MAX_NEWS_ITEMS);
        }

        // Mettre à jour (ou créer) le fichier
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `Add news item for ${incomingNewsItem.pole} [skip ci]`, // [skip ci] pour éviter une boucle de build infinie
            content: Buffer.from(JSON.stringify(existingNews, null, 2)).toString('base64'),
            sha: fileData.sha, // Fournir le SHA si le fichier existe
            branch: 'main', // Ou 'master' selon votre branche principale
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Actualité ajoutée et pushée sur GitHub ! Netlify va redéployer.' }),
        };

    } catch (error) {
        console.error('Error interacting with GitHub API or parsing existing file:', error);
        // Si le fichier n'existe pas encore (404), on le crée
        if (error.status === 404) {
             try {
                const newContent = [{
                    title: incomingNewsItem.title,
                    pole: incomingNewsItem.pole,
                    color: incomingNewsItem.color,
                    timestamp: new Date().toISOString()
                }];
                await octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: FILE_PATH,
                    message: `Create news feed with first item [skip ci]`,
                    content: Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64'),
                    branch: 'main',
                });
                 return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Flux créé et première actualité ajoutée ! Netlify va redéployer.' }),
                };
             } catch (createError) {
                 console.error('Error creating new GitHub file:', createError);
                 return {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to create news file on GitHub.', details: createError.message }),
                };
             }
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to save news to GitHub.', details: error.message }),
        };
    }
};
