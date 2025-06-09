import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour résoudre le chemin du fichier dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assurez-vous que ce chemin est correct par rapport à la racine de votre projet Netlify
// Si votre dossier 'data' est à la racine, alors 'data/prompts.json' est correct.
const PROMPTS_DB_PATH = path.resolve(__dirname, '../../data/prompts.json'); 

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
                console.warn(`getGalleryPrompts.mjs: Fichier de prompts non trouvé à ${PROMPTS_DB_PATH}. Retourne un tableau vide.`);
                prompts = []; // Le fichier n'existe pas encore, retourne un tableau vide
            } else {
                throw error; // Autre erreur de lecture de fichier, la propager
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
