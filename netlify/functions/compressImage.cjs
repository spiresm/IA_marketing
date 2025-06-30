// netlify/functions/compressImage.js
const sharp = require('sharp');

exports.handler = async (event, context) => {
    // --- TEMPORARY DEBUG LOGS (REMOVE AFTER SUCCESSFUL DEPLOYMENT) ---
    console.log('--- FUNCTION INVOKED ---');
    console.log('Event httpMethod:', event.httpMethod);
    console.log('Event isBase64Encoded:', event.isBase64Encoded);
    console.log('Event headers Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
    console.log('Event body (first 100 chars):', event.body ? event.body.substring(0, 100) : 'Body is empty');
    // --- END TEMPORARY DEBUG LOGS ---

    // Ensure the request is a POST method
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    let requestBody;
    try {
        // Defensive parsing for event.body
        // Try to decode from Base64 first, then parse as JSON
        // This handles cases where Netlify might Base64 encode JSON bodies
        try {
            const decodedBody = Buffer.from(event.body, 'base64').toString('utf8');
            requestBody = JSON.parse(decodedBody);
            console.log('Body parsed as Base64 then JSON'); // For debugging
        } catch (base64DecodeError) {
            // If Base64 decoding or JSON parsing of decoded string fails,
            // try to parse the body directly as JSON (assuming it's not Base64 encoded)
            requestBody = JSON.parse(event.body);
            console.log('Body parsed directly as JSON'); // For debugging
        }

        const base64Image = requestBody.image;
        const quality = requestBody.quality;

        // Validation of received data
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

        // Extract pure Base64 data from the data URL (remove "data:image/jpeg;base64," prefix)
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invalid Base64 data URL format. Could not extract image data.' }),
            };
        }
        const base64Data = matches[2]; // Pure Base64 data of the image

        // Convert pure Base64 string to a binary Buffer, which Sharp expects
        const imageBuffer = Buffer.from(base64Data, 'base64');

        let processedImageBuffer;
        const outputMimeType = 'image/jpeg'; // Force output format to JPEG for lossy compression

        // Définition de la hauteur maximale pour le redimensionnement
        const MAX_HEIGHT = 500;

        try {
            // Crée un pipeline Sharp
            let sharpPipeline = sharp(imageBuffer);

            // Récupère les métadonnées pour déterminer le redimensionnement nécessaire
            const metadata = await sharpPipeline.metadata();

            let newWidth = metadata.width;
            let newHeight = metadata.height;

            // Applique le redimensionnement si la hauteur dépasse MAX_HEIGHT
            if (metadata.height > MAX_HEIGHT) {
                newHeight = MAX_HEIGHT;
                // Calcule la nouvelle largeur pour maintenir les proportions
                newWidth = Math.round(metadata.width * (MAX_HEIGHT / metadata.height));
                
                sharpPipeline = sharpPipeline.resize(newWidth, newHeight, {
                    fit: 'inside', // S'assure que l'image tient dans les dimensions sans être coupée
                    withoutEnlargement: true // N'agrandit pas l'image si elle est déjà plus petite
                });
            }

            // Applique la compression JPEG
            processedImageBuffer = await sharpPipeline
                .jpeg({
                    quality: quality,
                    progressive: true,
                    chromaSubsampling: '4:4:4' // Utilise 4:4:4 pour potentiellement une meilleure qualité de couleur, mais un fichier plus grand
                })
                .toBuffer(); // Convertit l'image traitée en Buffer

        } catch (sharpError) {
            // Handle Sharp-specific compression/resize errors
            console.error('Sharp processing failed:', sharpError);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Image processing failed with Sharp (resize or compression). Check image format or data.', error: sharpError.message }),
            };
        }

        // Return the response to the client
        return {
            statusCode: 200, // Success
            headers: {
                'Content-Type': outputMimeType, // MIME type of the returned image (e.g., image/jpeg)
                'Content-Length': processedImageBuffer.length, // Size of the processed file
                'Access-Control-Allow-Origin': '*', // For CORS: allow requests from any origin (for development)
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: processedImageBuffer.toString('base64'), // Processed image content Base64 encoded
            isBase64Encoded: true, // Crucial: indicates to Netlify that the response body is Base64 encoded
        };

    } catch (error) {
        // Catch any other unexpected errors in the function (e.g., initial JSON parsing failure)
        console.error('General error in Netlify Function:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'An unexpected error occurred in the function.', error: error.message }),
        };
    }
};
