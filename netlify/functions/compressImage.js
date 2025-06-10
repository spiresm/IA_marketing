// Importe la bibliothèque 'sharp' pour la compression d'image
const sharp = require('sharp');
// Importe la bibliothèque 'multiparty' pour analyser les requêtes multipart/form-data
const multiparty = require('multiparty');
// Importe le module 'fs' (file system) pour lire le fichier temporaire créé par multiparty
const fs = require('fs');

/**
 * Fonction principale de la fonction Netlify.
 * C'est le point d'entrée qui sera appelé par la requête HTTP du client.
 *
 * @param {object} event L'objet événement HTTP fourni par Netlify Functions.
 * @param {object} context L'objet contexte fourni par Netlify Functions.
 * @returns {object} Un objet de réponse HTTP.
 */
exports.handler = async (event, context) => {
    // 1. Vérification de la méthode HTTP
    // S'assure que seule la méthode POST est autorisée pour la compression.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Méthode non autorisée
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    // 2. Traitement des données multipart/form-data
    // Utilise une Promise pour gérer le parsing asynchrone de multiparty.
    return new Promise((resolve) => {
        const form = new multiparty.Form();

        // Le corps de l'événement Netlify pour les requêtes avec fichier est encodé en Base64.
        // On doit le convertir en Buffer pour que multiparty puisse le traiter.
        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

        // Parse les données de formulaire contenues dans le Buffer du corps de la requête.
        // multiparty va créer des fichiers temporaires pour les uploads.
        form.parse(bodyBuffer, async (err, fields, files) => {
            // Gestion des erreurs lors de l'analyse du formulaire
            if (err) {
                console.error('Error parsing form data:', err);
                return resolve({
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to parse form data.', error: err.message }),
                });
            }

            // Récupération du fichier image et de la qualité
            // 'files.image' correspond au champ 'name="image"' de l'input type="file" du front-end.
            // 'fields.quality' correspond au champ 'name="quality"' du slider.
            const imageFile = files.image && files.image[0]; // multiparty retourne un tableau de fichiers
            const quality = fields.quality && parseInt(fields.quality[0], 10); // parseInt pour convertir en nombre entier

            // Vérification si l'image ou la qualité sont manquantes
            if (!imageFile || isNaN(quality) || quality < 1 || quality > 100) {
                // Nettoyage des fichiers temporaires si le parsing a échoué mais des fichiers ont été créés
                if (imageFile && imageFile.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
                return resolve({
                    statusCode: 400, // Requête invalide
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Image file or valid quality (1-100) is missing.' }),
                });
            }

            let imageBuffer;
            try {
                // Lit le contenu du fichier image à partir du chemin temporaire
                imageBuffer = fs.readFileSync(imageFile.path);
            } catch (readError) {
                console.error('Error reading temporary image file:', readError);
                return resolve({
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to read temporary image file.', error: readError.message }),
                });
            } finally {
                // IMPORTANT : Supprime le fichier temporaire créé par multiparty
                // Cela libère de l'espace et prévient les fuites de mémoire.
                if (imageFile.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
            }

            try {
                // 3. Compression de l'image avec Sharp
                // Détecte automatiquement le format de l'image d'entrée.
                // Output en JPEG pour la compatibilité et la compression avec perte.
                const compressedBuffer = await sharp(imageBuffer)
                    .jpeg({
                        quality: quality,      // La qualité de compression (1-100)
                        progressive: true,     // Pour un chargement progressif
                        chromaSubsampling: '4:4:4' // Utilise 4:4:4 pour conserver les couleurs vives
                    })
                    // Ajoutez d'autres options si vous voulez gérer différents formats de sortie
                    // .png({ compressionLevel: 9, quality: quality })
                    // .webp({ quality: quality })
                    .toBuffer(); // Convertit l'image compressée en Buffer

                // 4. Retour de la réponse au client
                // Le corps binaire doit être encodé en Base64 pour Netlify Functions.
                resolve({
                    statusCode: 200, // Succès
                    headers: {
                        'Content-Type': 'image/jpeg', // Définit le type de contenu de la réponse (ex: image/jpeg)
                        'Content-Length': compressedBuffer.length, // La taille du fichier compressé
                        // Ajout de CORS pour s'assurer que le navigateur du client peut accéder à cette réponse
                        // (Bien que déjà dans netlify.toml, c'est une bonne pratique de l'avoir ici aussi pour les fonctions)
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                    body: compressedBuffer.toString('base64'), // Le contenu de l'image compressée encodé en Base64
                    isBase64Encoded: true, // Indique à Netlify que le corps est encodé en Base64
                });

            } catch (compressionError) {
                console.error('Error during image compression with sharp:', compressionError);
                return resolve({
                    statusCode: 500, // Erreur interne du serveur
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Failed to compress image due to server error.', error: compressionError.message }),
                });
            }
        });
    });
};
