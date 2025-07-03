const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier'); // Ajouté pour uploader à partir d'un buffer/stream

// Configuration Cloudinary (assumant que les variables d'environnement sont correctement définies sur Netlify)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Utilise HTTPS
});

exports.handler = async (event, context) => {
    console.log("--- uploadMedia function: Début d'invocation ---");
    console.log("Méthode HTTP:", event.httpMethod);
    console.log("Corps de la requête (longueur):", event.body ? event.body.length : 0);

    // Gérer les requêtes OPTIONS (preflight) pour CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*', // À adapter en production avec votre domaine spécifique
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch (parseError) {
        console.error('❌ uploadMedia: Erreur de parsing JSON:', parseError);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invalid JSON body.' }),
        };
    }

    const { fileContent, fileName, fileType } = payload;

    if (!fileContent || !fileName || !fileType) {
        console.error('❌ uploadMedia: Missing fileContent, fileName, or fileType.');
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Missing file content, name, or type.' }),
        };
    }

    try {
        // --- DÉBUT DES MODIFICATIONS CLÉS POUR GÉRER LES FICHIERS JSON/DOCUMENTS ---
        let resourceType = 'auto'; // Laisser Cloudinary détecter si possible, mais spécifier pour 'raw'
        let resourceFormat = fileName.split('.').pop(); // Récupérer l'extension originale

        if (fileType.startsWith('image/')) {
            resourceType = 'image';
        } else if (fileType.startsWith('video/')) {
            resourceType = 'video';
        } else {
            // Pour tous les autres types (PDF, JSON, TXT, DOC, XLS, PPT), utilisez 'raw'
            resourceType = 'raw';
            // Pour les fichiers raw, le format est souvent important pour le téléchargement
            // Si le fileType est 'application/json' ou 'application/pdf', Cloudinary le gérera bien.
            // Si c'est un format non détecté, il est bon de spécifier l'extension.
        }

        // Nettoyer le nom de fichier pour un public_id propre (supprime les extensions pour éviter les doublons)
        const baseFileName = fileName.split('.').slice(0, -1).join('.'); // Nom sans extension
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const cleanedPublicId = `${baseFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${uniqueSuffix}`;

        console.log(`📡 uploadMedia: Tentative d'upload de ${fileName} (type détecté: ${resourceType}, type MIME: ${fileType}) vers Cloudinary...`);

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'imarketing_media', // Votre dossier dans Cloudinary
                    public_id: cleanedPublicId, // ID public unique
                    resource_type: resourceType, // C'EST LA CLÉ ! Utilise 'image', 'video' ou 'raw'
                    format: resourceFormat,      // Conserve le format original
                    // 'quality' et 'fetch_format' ne sont pertinents que pour les images/vidéos
                    // et peuvent causer des problèmes pour les fichiers 'raw'.
                    // Il est préférable de les conditionner ou de les omettre pour 'raw'.
                    ...(resourceType !== 'raw' && { quality: 'auto', fetch_format: 'auto' }),
                },
                (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary Uploader Error:', error);
                        return reject(error);
                    }
                    resolve(result);
                }
            );
            // Crée un ReadStream à partir du buffer Base64 et le pipe vers le stream d'upload Cloudinary
            streamifier.createReadStream(Buffer.from(fileContent, 'base64')).pipe(uploadStream);
        });
        // --- FIN DES MODIFICATIONS CLÉS ---

        console.log('✅ Cloudinary Upload Result:', uploadResult);

        let thumbnailUrl = null;
        if (resourceType === 'video') {
            try {
                thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: 'video',
                    format: 'jpg',
                    width: 400,
                    height: 225,
                    crop: "fill",
                    quality: 'auto',
                });
                console.log('✅ Video Thumbnail URL générée:', thumbnailUrl);
            } catch (thumbError) {
                console.error('❌ Erreur lors de la génération de l\'URL de la miniature:', thumbError);
                thumbnailUrl = null;
            }
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                url: uploadResult.secure_url,
                thumbnailUrl: thumbnailUrl
            }),
        };

    } catch (error) {
        console.error('❌ uploadMedia: Erreur générale lors de l\'upload (catch principal):', error);

        let statusCode = 500;
        let errorMessage = 'Une erreur inconnue est survenue lors de l\'upload du média.';

        if (error.http_code) {
            statusCode = error.http_code;
            errorMessage = `Cloudinary API Error (${error.http_code}): ${error.message}`;
        } else if (error instanceof SyntaxError) {
            statusCode = 400;
            errorMessage = 'Invalid request payload (not valid JSON).';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Échec de l'upload du média: ${errorMessage}` }),
        };
    }
};
