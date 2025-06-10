// netlify/functions/compressImage.js

const sharp = require('sharp');
const multiparty = require('multiparty');
const fs = require('fs');
const { Readable } = require('stream'); // Importe la classe Readable

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    return new Promise((resolve) => {
        const form = new multiparty.Form();

        // Créer un Readable Stream à partir du corps de l'événement Netlify
        const requestStream = new Readable();
        requestStream.push(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
        requestStream.push(null); // Indique la fin du stream

        // CRUCIAL : Simuler un objet 'req' (requête HTTP) avec les en-têtes que multiparty attend.
        // multiparty a besoin de req.headers['content-type'] et req.headers['content-length']
        const fakeReq = {
            headers: event.headers, // Utilise les en-têtes réels de l'événement Netlify
            // On s'assure que Content-Length est bien là, même si Netlify le gère différemment
            // Netlify ne met pas Content-Length dans event.headers pour les requêtes POST
            // mais multiparty peut le déduire du stream si le Content-Type est correct.
            // On pourrait tenter d'ajouter event.body.length ici, mais ce n'est pas fiable avec Base64.
            // La solution est de s'assurer que multiparty traite le stream correctement.
            // La méthode .parse(stream, headers, cb) de multiparty est la bonne.
        };


        // La bonne façon d'appeler form.parse avec un stream et des headers dans multiparty.
        // Il faut lui passer le stream, puis un objet qui contient les en-têtes.
        form.parse(requestStream, { headers: event.headers }, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form data:', err);
                return resolve({
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to parse form data.', error: err.message }),
                });
            }

            const imageFile = files.image && files.image[0];
            const quality = fields.quality && parseInt(fields.quality[0], 10);

            if (!imageFile || isNaN(quality) || quality < 1 || quality > 100) {
                if (imageFile && imageFile.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
                return resolve({
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Image file or valid quality (1-100) is missing or invalid.' }),
                });
            }

            let imageBuffer;
            try {
                imageBuffer = fs.readFileSync(imageFile.path);
            } catch (readError) {
                console.error('Error reading temporary image file:', readError);
                return resolve({
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to read temporary image file.', error: readError.message }),
                });
            } finally {
                if (imageFile.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
            }

            try {
                const compressedBuffer = await sharp(imageBuffer)
                    .jpeg({
                        quality: quality,
                        progressive: true,
                        chromaSubsampling: '4:4:4'
                    })
                    .toBuffer();

                resolve({
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'image/jpeg',
                        'Content-Length': compressedBuffer.length,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                    body: compressedBuffer.toString('base64'),
                    isBase64Encoded: true,
                });

            } catch (compressionError) {
                console.error('Error during image compression with sharp:', compressionError);
                return resolve({
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to compress image due to server error.', error: compressionError.message }),
                });
            }
        });
    });
};
