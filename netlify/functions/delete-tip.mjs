// netlify/functions/delete-tip.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Déterminer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin relatif au fichier all-tips.json
// Attention : en production sur Netlify, le fichier est dans le répertoire .netlify/functions/
// En local, il peut être à la racine du projet ou dans le même dossier que la fonction.
// Nous allons assumer qu'il est à la racine du site déployé.
// Pour les fonctions Netlify, les fichiers statiques sont dans le répertoire 'publish' (par défaut le dossier racine de votre site).
const TIPS_FILE_PATH = path.resolve(__dirname, '../../../all-tips.json'); // Remonte de functions/ à .netlify/ et ensuite à la racine du site

export default async (event, context) => {
    // Permettre uniquement la méthode DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Récupérer l'ID du tip à supprimer depuis les paramètres de la requête
    const tipId = event.queryStringParameters.id;

    if (!tipId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing tip ID' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    try {
        let tipsData;
        try {
            // Lire le fichier all-tips.json
            const data = await fs.readFile(TIPS_FILE_PATH, 'utf8');
            tipsData = JSON.parse(data);
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                // Le fichier n'existe pas, cela signifie qu'il n'y a pas de tips
                tipsData = [];
            } else {
                console.error('Error reading all-tips.json:', readError);
                throw new Error('Failed to read tips data');
            }
        }

        // Filtrer la liste pour retirer le tip avec l'ID donné
        const initialLength = tipsData.length;
        const updatedTips = tipsData.filter(tip => tip.id !== tipId);

        if (updatedTips.length === initialLength) {
            // Aucun tip n'a été supprimé, l'ID n'a pas été trouvé
            return {
                statusCode: 404,
                body: JSON.stringify({ message: `Tip with ID ${tipId} not found.` }),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // Réécrire le fichier all-tips.json avec la liste mise à jour
        await fs.writeFile(TIPS_FILE_PATH, JSON.stringify(updatedTips, null, 2), 'utf8');

        // Déclencher un nouveau déploiement sur Netlify
        // Cela est crucial pour que les changements dans all-tips.json soient propagés sur votre site live.
        // Vous devrez configurer une variable d'environnement NETLIFY_BUILD_HOOK_URL dans Netlify.
        // Allez dans Netlify Dashboard -> Your Site -> Site settings -> Build & deploy -> Continuous Deployment -> Build hooks
        // Créez un nouveau webhook, nommez-le (ex: "Trigger Deploy After Tip Delete")
        // Copiez l'URL du webhook et ajoutez-la comme variable d'environnement.
        const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
        if (buildHookUrl) {
            console.log('Triggering Netlify build hook...');
            const buildResponse = await fetch(buildHookUrl, { method: 'POST' });
            if (!buildResponse.ok) {
                console.error(`Failed to trigger Netlify build hook: ${buildResponse.status} ${buildResponse.statusText}`);
            } else {
                console.log('Netlify build hook triggered successfully.');
            }
        } else {
            console.warn('NETLIFY_BUILD_HOOK_URL is not set. Manual deploy will be required to see changes.');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip deleted successfully and deploy triggered.' }),
            headers: { 'Content-Type': 'application/json' },
        };

    } catch (error) {
        console.error('Error in delete-tip function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Failed to delete tip: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
