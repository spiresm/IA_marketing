import { promises as fs } from 'fs';
import path from 'path';
// Supprimez l'importation de fileURLToPath car nous n'utiliserons plus __filename et __dirname de cette manière.
// import { fileURLToPath } from 'url'; 

// Solution plus robuste pour le chemin du fichier de données dans Netlify Functions
// `process.cwd()` pointe généralement vers le répertoire racine de votre fonction déployée (`/var/task/`).
// Si votre dossier 'data' est à la racine de votre dépôt Git,
// il sera accessible directement sous `/var/task/data/` sur Netlify.
const PROMPTS_DB_PATH = path.join(process.cwd(), 'data', 'prompts.json');

// Option de débogage : décommentez pour voir le chemin exact dans les logs Netlify
// console.log(`getGalleryPrompts.mjs: PROMPTS_DB_PATH résolu à : ${PROMPTS_DB_PATH}`);

export const handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez GET.' }),
        };
    }

    try {
        let prompts = [];
        try {
            const content = await fs.readFile(PROMPTS_DB_PATH, 'utf-8');
            prompts = JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Le fichier n'existe pas encore, c'est normal au premier lancement ou si pas de prompts.
                console.warn(`getGalleryPrompts.mjs: Fichier de prompts non trouvé à ${PROMPTS_DB_PATH}. Retourne un tableau vide.`);
                prompts = []; 
            } else {
                // Pour toute autre erreur de lecture (ex: fichier corrompu, permissions), on la log et la propage.
                console.error(`getGalleryPrompts.mjs: Erreur inattendue lors de la lecture du fichier prompts.json: ${error.message}`, error);
                throw error; 
            }
        }
        
        // Assurez-vous que les prompts contiennent bien 'auteur' et 'imageUrl'
        // et qu'ils sont des chaînes de caractères valides.
        const filteredPrompts = prompts.filter(p => p.auteur && p.imageUrl);

        console.log(`getGalleryPrompts.mjs: ${filteredPrompts.length} prompts de galerie récupérés.`);

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // Essentiel pour CORS
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(filteredPrompts),
        };
    } catch (error) {
        // Cette erreur attrape les erreurs inattendues ou celles propagées du bloc try/catch interne.
        console.error('getGalleryPrompts.mjs: Erreur lors de la récupération des prompts de galerie :', error);
        return {
            statusCode: 500,
            headers: { 
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur: ${error.message}` }),
        };
    }
};
