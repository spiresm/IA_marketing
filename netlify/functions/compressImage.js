// netlify/functions/compressImage.js

const sharp = require('sharp');
// const multiparty = require('multiparty'); // N'est plus nécessaire !

exports.handler = async (event, context) => {
    // 1. Vérification de la méthode HTTP (doit être POST)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Méthode non autorisée
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    try {
        // Le corps de l'événement Netlify pour les requêtes JSON est déjà une chaîne.
        // On la parse directement en JSON.
        const requestBody = JSON.parse(event.body); // event.body est déjà une chaîne JSON par défaut pour Netlify

        const base64Image = requestBody.image;
        const quality = requestBody.quality;

        // 2. Validation des données reçues
        if (!base64Image || typeof base64Image !== 'string' || !base64Image.startsWith('data:image')) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid image data. Expected Base64 data URL (e.g., data:image/jpeg;base64,...).' }),
            };
        }
        if (isNaN(quality) || quality < 1 || quality > 100) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid quality parameter. Expected a number between 1 and 100.' }),
            };
        }

        // Extraire les données Base64 pures (sans le préfixe "data:image/jpeg;base64,")
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid Base64 data URL format. Could not extract image data.' }),
            };
        }
        const imageMimeType = matches[1]; // ex: 'image/jpeg', 'image/png'
        const base64Data = matches[2]; // Les données Base64 pures de l'image

        // Convertir la chaîne Base64 pure en Buffer binaire pour Sharp
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 3. Compression de l'image avec Sharp
        let compressedBuffer;
        // Définir le type MIME de sortie. Nous allons forcer le JPEG ici pour la compression avec perte.
        const outputMimeType = 'image/jpeg';

        try {
            compressedBuffer = await sharp(imageBuffer)
                .jpeg({
                    quality: quality,      // La qualité de compression (1-100)
                    progressive: true,     // Pour un chargement progressif
                    chromaSubsampling: '4:4:4' // Utilise 4:4:4 pour conserver les couleurs vives (peut être '4:2:0' pour plus de compression)
                })
                // Vous pouvez ajouter d'autres options si vous voulez gérer différents formats ou optimisations
                // .toFormat(sharp.format.jpeg) // Force le format de sortie si nécessaire
                .toBuffer(); // Convertit l'image compressée en Buffer
        } catch (sharpError) {
            console.error('Sharp compression failed:', sharpError);
            // Gérer les erreurs spécifiques de Sharp (ex: format d'image non pris en charge)
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Image compression failed with Sharp. Check image format or data.', error: sharpError.message }),
            };
        }

        // 4. Retour de la réponse au client
        // Le corps binaire de l'image compressée doit être encodé en Base64 pour Netlify Functions.
        return {
            statusCode: 200, // Succès
            headers: {
                'Content-Type': outputMimeType, // Définit le type de contenu de la réponse (ex: image/jpeg)
                'Content-Length': compressedBuffer.length, // La taille du fichier compressé
                'Access-Control-Allow-Origin': '*', // Pour CORS, permet à n'importe quelle origine d'accéder
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: compressedBuffer.toString('base64'), // Le contenu de l'image compressée encodé en Base64
            isBase64Encoded: true, // Crucial : indique à Netlify que le corps est encodé en Base64
        };

    } catch (error) {
        // Gérer les erreurs générales de parsing ou d'exécution non capturées par Sharp
        console.error('General error in Netlify Function:', error);
        return {
            statusCode: 500, // Erreur interne du serveur
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'An unexpected error occurred in the function.', error: error.message }),
        };
    }
};
