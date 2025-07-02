// netlify/functions/uploadMedia.js

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

    const { fileContent, fileName, fileType } = payload; // Ajout de fileType envoyé par le frontend

    if (!fileContent || !fileName || !fileType) {
        console.error('❌ uploadMedia: Missing fileContent, fileName, or fileType.');
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Missing file content, name, or type.' }),
        };
    }

    try {
        // Détecter le type de ressource pour Cloudinary
        const resourceType = fileType.startsWith('video/') ? 'video' : 'image';
        
        // Nettoyer le nom de fichier pour un public_id propre
        const baseFileName = fileName.split('.')[0];
        const cleanedPublicId = `${Date.now()}_${baseFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}`; // Remplace les caractères non alphanumériques par '_'

        console.log(`📡 uploadMedia: Tentative d'upload de ${fileName} (type détecté: ${resourceType}, type MIME: ${fileType}) vers Cloudinary...`);
        
        // Utiliser upload_stream pour les uploads Base64, c'est plus efficace et gère mieux les gros fichiers
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'imarketing_media', // Votre dossier dans Cloudinary
                    public_id: cleanedPublicId, // ID public unique
                    resource_type: resourceType,
                    // Si c'est une image, on peut laisser Cloudinary optimiser
                    // Si c'est une vidéo, Cloudinary va appliquer ses optimisations par défaut
                    quality: 'auto',        
                    fetch_format: 'auto' 
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
            // Le fileContent est une chaîne Base64 SANS le préfixe 'data:image/jpeg;base64,'
            // Il faut la reconvertir en Buffer si elle est envoyée sans préfixe, sinon utilisez le préfixe complet comme source.
            // Pour l'instant, le frontend envoie juste le contenu Base64 (après le 'split(',')[1]'), donc c'est un Buffer qu'il faut créer.
            streamifier.createReadStream(Buffer.from(fileContent, 'base64')).pipe(uploadStream);
        });

        console.log('✅ Cloudinary Upload Result:', uploadResult);

        let thumbnailUrl = null;
        if (resourceType === 'video') {
            // Générer l'URL de la miniature de la vidéo via Cloudinary
            try {
                // Cloudinary peut générer des vignettes d'images à partir de vidéos.
                // On utilise le public_id de la vidéo et des transformations pour obtenir une image.
                thumbnailUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: 'video', // Source est une vidéo
                    format: 'jpg',          // Format de la vignette
                    width: 400,             // Largeur de la vignette
                    height: 225,            // Hauteur de la vignette
                    crop: "fill",           // Mode de recadrage
                    quality: 'auto',
                    // start_offset: 'auto', // Optionnel: pour prendre une frame auto ou à un certain temps
                    // secure: true // Déjà dans la config globale, mais peut être spécifié ici si besoin
                });
                console.log('✅ Video Thumbnail URL générée:', thumbnailUrl);
            } catch (thumbError) {
                console.error('❌ Erreur lors de la génération de l\'URL de la miniature:', thumbError);
                thumbnailUrl = null;
            }
        }

        // Retourne l'URL du média principal et l'URL de la miniature (si vidéo, sinon null)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // À adapter en production avec votre domaine spécifique
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({
                url: uploadResult.secure_url, // L'URL de la vidéo/image uploadée
                thumbnailUrl: thumbnailUrl    // L'URL de la miniature (null pour les images, URL pour les vidéos)
            }),
        };

    } catch (error) {
        console.error('❌ uploadMedia: Erreur générale lors de l\'upload (catch principal):', error);
        
        let statusCode = 500;
        let errorMessage = 'Une erreur inconnue est survenue lors de l\'upload du média.';

        if (error.http_code) { // Erreurs spécifiques de Cloudinary
            statusCode = error.http_code;
            errorMessage = `Cloudinary API Error (${error.http_code}): ${error.message}`;
        } else if (error instanceof SyntaxError) { // Si JSON.parse a échoué plus tôt
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
