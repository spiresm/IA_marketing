// netlify/functions/compressImage.js

const sharp = require('sharp');
// const multiparty = require('multiparty'); // <-- CETTE LIGNE DOIT ÊTRE SUPPRIMÉE OU COMMENTÉE !

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
        const requestBody = JSON.parse(event.body);

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
        // const imageMimeType = matches[1]; // Vous n'avez pas besoin de cette variable si vous forcez le JPEG en sortie
        const base64Data = matches[2]; // Les données Base64 pures de l'image

        // Convertir la chaîne Base64 pure en Buffer binaire pour Sharp
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 3. Compression de l'image avec Sharp
        let compressedBuffer;
        const outputMimeType = 'image/jpeg'; // On force le JPEG ici pour la compression avec perte.

        try {
            compressedBuffer = await sharp(imageBuffer)
                .jpeg({
                    quality: quality,
                    progressive: true,
                    chromaSubsampling: '4:4:4'
                })
                .toBuffer();
        } catch (sharpError) {
            console.error('Sharp compression failed:', sharpError);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Image compression failed with Sharp. Check image format or data.', error: sharpError.message }),
            };
        }

        // 4. Retour de la réponse au client
        return {
            statusCode: 200,
            headers: {
                'Content-Type': outputMimeType,
                'Content-Length': compressedBuffer.length,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: compressedBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error('General error in Netlify Function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'An unexpected error occurred in the function.', error: error.message }),
        };
    }
};
