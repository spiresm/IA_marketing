// netlify/functions/uploadMedia.js

// Utilisez 'require' pour Cloudinary, puisque cela fonctionnait avant
const cloudinary = require('cloudinary').v2; 

// Configuration Cloudinary (assumant que les variables d'environnement sont correctement définies sur Netlify)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Utilise HTTPS
});

exports.handler = async (event, context) => {
    // Log dès le début pour vérifier l'invocation
    console.log("--- uploadMedia function: Début d'invocation (version corrigée vignette) ---");
    console.log("Méthode HTTP:", event.httpMethod);
    console.log("Corps de la requête (longueur):", event.body ? event.body.length : 0);

    // Gérer les requêtes OPTIONS (preflight) pour CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*',
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

    try {
        const { fileContent, fileName } = JSON.parse(event.body); // Le frontend envoie le contenu base64 et le nom

        if (!fileContent || !fileName) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Missing file content or name.' }),
            };
        }

        // Détecter le type de média (image ou vidéo) par l'extension
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'].includes(fileExtension);
        const resourceType = isVideo ? 'video' : 'image';

        // Log les infos avant l'appel Cloudinary
        console.log(`📡 uploadMedia: Tentative d'upload de ${fileName} (type: ${resourceType}) vers Cloudinary...`);
        
        // Upload du fichier vers Cloudinary
        const uploadResult = await cloudinary.uploader.upload(
            `data:application/octet-stream;base64,${fileContent}`, // Utilise application/octet-stream pour laisser Cloudinary déduire le type
            {
                folder: 'imarketing_media', // Votre dossier dans Cloudinary
                public_id: `${Date.now()}_${fileName.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '')}`, // ID public unique (sans extension initiale)
                resource_type: resourceType, // 'image' ou 'video'
                quality: 'auto',        
                fetch_format: 'auto' 
            }
        );

        console.log('✅ Cloudinary Upload Result:', uploadResult);

        let thumbnailUrl = null;
        if (isVideo) {
            try { // Bloc try-catch spécifique pour la génération de la miniature
                // uploadResult.public_id contient le public ID (ex: "imarketing_media/1751483542865-social_spiresm_httpss")
                // Cloudinary construit l'URL de la vignette en utilisant ce public_id
                thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: 'image', // Demander une ressource de type image
                    format: 'jpg',          // Format de la vignette
                    quality: 'auto',        // Qualité automatique
                    // width: 400, height: 225, crop: "fill" // Exemple de transformations pour la vignette
                });
                console.log('✅ Video Thumbnail URL générée:', thumbnailUrl);
            } catch (thumbError) {
                // Log l'erreur de génération de miniature mais ne bloque pas l'upload principal
                console.error('❌ Erreur lors de la génération de l\'URL de la miniature:', thumbError);
                thumbnailUrl = null; // Assure que thumbnailUrl est null en cas d'échec
            }
        }

        // Retourne l'URL du média principal et l'URL de la miniature (si vidéo, sinon null)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                url: uploadResult.secure_url, // L'URL de la vidéo/image uploadée
                thumbnailUrl: thumbnailUrl    // L'URL de la miniature (null pour les images)
            }),
        };

    } catch (error) {
        // Log l'erreur générale plus en détail
        console.error('❌ uploadMedia: Erreur lors de l\'upload vers Cloudinary (catch principal):', error);
        
        let errorMessage = 'Une erreur inconnue est survenue lors de l\'upload.';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.http_code) { // Erreurs spécifiques de Cloudinary
            errorMessage = `Cloudinary API Error: ${error.http_code} - ${error.message}`;
        }
        
        return {
            statusCode: error.http_code || 500, // Tente de retourner le code d'erreur HTTP de Cloudinary
            body: JSON.stringify({ message: `Échec de l'upload du média: ${errorMessage}` }),
        };
    }
};
