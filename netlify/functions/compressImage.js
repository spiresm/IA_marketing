// netlify/functions/compressImage.js

const sharp = require('sharp');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    try {
        // --- DÉBUT DE LA CORRECTION POUR LE PARSING DU BODY ---
        let requestBody;
        if (event.isBase64Encoded) {
            // Si le corps est encodé en Base64, il faut d'abord le décoder
            requestBody = JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
        } else {
            // Sinon, il est déjà en texte (JSON stringifié)
            requestBody = JSON.parse(event.body);
        }
        // --- FIN DE LA CORRECTION ---

        const base64Image = requestBody.image;
        const quality = requestBody.quality;

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

        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid Base64 data URL format. Could not extract image data.' }),
            };
        }
        const base64Data = matches[2];

        const imageBuffer = Buffer.from(base64Data, 'base64');

        let compressedBuffer;
        const outputMimeType = 'image/jpeg';

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
