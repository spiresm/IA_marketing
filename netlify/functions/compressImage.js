// netlify/functions/compressImage.js

const sharp = require('sharp'); // Cette ligne ne doit être présente qu'UNE SEULE fois

exports.handler = async (event, context) => {
    // Vérifie que la requête est bien une méthode POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Méthode non autorisée
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    try {
        // Netlify parse automatiquement le corps de la requête JSON si le Content-Type est 'application/json'.
        // Donc, event.body est déjà une chaîne JSON que nous pouvons parser directement.
        const requestBody = JSON.parse(event.body);

        const base64Image = requestBody.image;
        const quality = requestBody.quality;

        // Validation des données reçues
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

        // Extrait les données Base64 pures de l'URL de données (enlève le préfixe "data:image/jpeg;base64,")
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid Base64 data URL format. Could not extract image data.' }),
            };
        }
        const base64Data = matches[2]; // Les données Base64 de l'image

        // Convertit la chaîne Base64 pure en un Buffer binaire, format attendu par Sharp
        const imageBuffer = Buffer.from(base64Data, 'base64');

        let compressedBuffer;
        const outputMimeType = 'image/jpeg'; // Définit le format de sortie comme JPEG pour la compression avec perte

        try {
            // Utilise Sharp pour compresser l'image
            compressedBuffer = await sharp(imageBuffer)
                .jpeg({
                    quality: quality,      // Applique la qualité spécifiée (1-100)
                    progressive: true,     // Active le chargement progressif
                    chromaSubsampling: '4:4:4' // Préserve mieux les couleurs, peut être '4:2:0' pour plus de compression
                })
                .toBuffer(); // Convertit l'image compressée en Buffer
        } catch (sharpError) {
            // Gère les erreurs spécifiques à la compression avec Sharp (ex: format non supporté)
            console.error('Sharp compression failed:', sharpError);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Image compression failed with Sharp. Check image format or data.', error: sharpError.message }),
            };
        }

        // Retourne la réponse au client
        // Le corps binaire de l'image compressée doit être encodé en Base64 pour Netlify Functions.
        return {
            statusCode: 200, // Succès
            headers: {
                'Content-Type': outputMimeType, // Type MIME de l'image retournée (ici image/jpeg)
                'Content-Length': compressedBuffer.length, // Taille du fichier compressé
                'Access-Control-Allow-Origin': '*', // Permet les requêtes de n'importe quelle origine (pour le développement)
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: compressedBuffer.toString('base64'), // Le contenu de l'image compressée encodé en Base64
            isBase64Encoded: true, // Indique à Netlify que le corps de la réponse est encodé en Base64
        };

    } catch (error) {
        // Capture toute autre erreur inattendue dans la fonction
        console.error('General error in Netlify Function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'An unexpected error occurred in the function.', error: error.message }),
        };
    }
};
