// netlify/functions/uploadMedia.js

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary avec vos variables d'environnement Netlify
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Utilise HTTPS
});

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { fileContent, fileName } = JSON.parse(event.body);

    if (!fileContent || !fileName) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Missing fileContent or fileName.' }) };
    }

    // Détecter le type de fichier pour l'upload
    const isVideo = fileName.match(/\.(mp4|mov|avi|wmv|flv|webm)$/i);
    const resourceType = isVideo ? 'video' : 'image';

    try {
        const uploadResult = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${fileContent}`, // Cloudinary peut déduire le type de fichier de la base64
            {
                folder: 'imarketing_media', // Dossier où stocker les médias dans Cloudinary
                public_id: `${Date.now()}-${fileName.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '')}`, // ID public unique
                resource_type: resourceType, // 'image' ou 'video'
                // Pour les vidéos, Cloudinary génère automatiquement une vignette.
                // On peut la récupérer en changeant le resource_type et l'extension.
                // Pas besoin d'options spécifiques ici pour la vignette, elle sera construite après.
            }
        );

        console.log('✅ Cloudinary Upload Result:', uploadResult);

        let thumbnailUrl = null;
        if (isVideo) {
            // Construire l'URL de la miniature de la vidéo
            // Cloudinary génère une miniature par défaut à partir de la vidéo.
            // L'URL de la miniature est généralement l'URL de la vidéo avec une transformation d'image
            // et une extension d'image (par exemple, .jpg).
            // Exemple: https://res.cloudinary.com/your_cloud_name/video/upload/v123456789/your_public_id.mp4
            // Miniature: https://res.cloudinary.com/your_cloud_name/image/upload/v123456789/your_public_id.jpg
            // Ou avec une transformation spécifique pour la vignette:
            // https://res.cloudinary.com/your_cloud_name/video/upload/w_200,h_150,c_fill,f_jpg/v123456789/your_public_id.mp4
            // Pour simplifier, nous allons utiliser l'URL de base de la vidéo et la modifier pour obtenir la vignette par défaut.
            // La méthode `url` de Cloudinary peut aider à construire cela.

            // Obtenir l'URL de la vignette par défaut générée par Cloudinary
            // C'est l'URL de la vidéo, mais en tant qu'image (type 'image') et avec une extension .jpg
            // Exemple: from 'video/upload/v123/my_video.mp4' to 'image/upload/v123/my_video.jpg'
            const publicIdWithoutExtension = uploadResult.public_id; // public_id est déjà sans extension si configuré
            thumbnailUrl = cloudinary.url(publicIdWithoutExtension, {
                resource_type: 'image', // Demander une ressource de type image
                format: 'jpg',          // Format de la vignette
                quality: 'auto',        // Qualité auto
                fetch_format: 'auto'    // Format de récupération auto
                // Vous pouvez ajouter des transformations ici si vous voulez une taille spécifique pour la vignette:
                // width: 400, height: 225, crop: "fill"
            });
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
                url: uploadResult.secure_url, // L'URL de la vidéo ou de l'image principale
                thumbnailUrl: thumbnailUrl // L'URL de la miniature de la vidéo (sera null pour les images)
            }),
        };

    } catch (error) {
        console.error('❌ Cloudinary Upload Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to upload media to Cloudinary.', error: error.message }),
        };
    }
}
