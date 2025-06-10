// netlify/functions/compressImage.js
const sharp = require('sharp');
const multiparty = require('multiparty'); // Pour gérer les données de formulaire multipart

exports.handler = async (event, context) => {
    // S'assurer que la requête est une POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // Traitement des données de formulaire (image et qualité)
    // Netlify Functions reçoit les requêtes multipart/form-data dans event.body,
    // mais il doit être parsé.
    return new Promise((resolve, reject) => {
        const form = new multiparty.Form();

        // Le corps de l'événement Netlify est en Base64 si c'est binaire
        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

        // multiparty.Form.parse() attend un ReadableStream ou une chaîne pour event.body.
        // On doit le traiter un peu différemment si c'est un Buffer.
        // La façon la plus simple est de le passer à travers un ReadableStream factice ou de simuler un req
        // Cependant, l'intégration de Netlify Functions avec multiparty peut être délicate.
        // Une approche plus simple pour les fonctions Netlify est de recevoir l'image en tant que Base64 direct
        // ou de gérer un type de contenu plus simple si possible, mais le frontend envoie FormData.

        // Une manière de faire fonctionner multiparty avec un Buffer:
        form.parse(bodyBuffer, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form data:', err);
                return resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to parse form data' }),
                });
            }

            const imageFile = files.image && files.image[0];
            const quality = fields.quality && parseInt(fields.quality[0]);

            if (!imageFile || !quality) {
                return resolve({
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Image file or quality missing' }),
                });
            }

            try {
                // Lire le contenu de l'image à partir du chemin temporaire fourni par multiparty
                const imageBuffer = require('fs').readFileSync(imageFile.path);

                // Compresser l'image avec sharp
                const compressedBuffer = await sharp(imageBuffer)
                    .jpeg({ quality: quality, progressive: true }) // Options pour JPEG
                    // .png({ compressionLevel: 9, quality: quality }) // Options pour PNG si nécessaire
                    // .webp({ quality: quality }) // Options pour WebP si nécessaire
                    .toBuffer();

                // Retourner l'image compressée encodée en Base64
                // Netlify Functions exige que les réponses binaires soient en Base64
                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'image/jpeg', // Très important ! Le navigateur a besoin de ce header
                        'Content-Length': compressedBuffer.length,
                    },
                    body: compressedBuffer.toString('base64'),
                    isBase64Encoded: true, // Crucial pour indiquer que le corps est encodé en Base64
                });

            } catch (compressionError) {
                console.error('Error during image compression:', compressionError);
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Failed to compress image', error: compressionError.message }),
                });
            }
        });
    });
};
