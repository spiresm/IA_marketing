// netlify/functions/uploadMedia.js

// Changez la ligne d'importation de Cloudinary pour utiliser 'require'
const cloudinary = require('cloudinary').v2; 
// REMOVED: import { v2 as cloudinary } from 'cloudinary'; // Supprimez cette ligne si elle était présente

// Pas besoin de 'Buffer' si le body est déjà base64, mais le garder ne fait pas de mal si d'autres fonctions l'utilisent.
// const { Buffer } = require('buffer'); 

// ... (le reste de votre code de fonction est déjà correct)

exports.handler = async (event, context) => {
    // Log dès le début pour vérifier l'invocation (IMPORTANT pour le diagnostic)
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
        console.log(`📡 uploadMedia: Tentative d'upload de ${fileName} (${resourceType}) vers Cloudinary...`);
        
        // Upload du fichier vers Cloudinary
        const uploadResult = await cloudinary.uploader.upload(
            `data:${file.type};base64,${fileContent}`, // Assurez-vous que le MIME type est correct (sera déduit par Cloudinary)
            {
                folder: 'imarketing_media', // Votre dossier Cloudinary
                public_id: `${Date.now()}_${fileName.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '')}`,
                resource_type: resourceType,
                // quality et format auto pour l'optimisation par Cloudinary
                quality: 'auto',        
                fetch_format: 'auto'
            }
        );

        console.log('✅ Cloudinary Upload Result:', uploadResult);

        let thumbnailUrl = null;
        if (isVideo) {
            // Construire l'URL de la miniature de la vidéo
            const publicIdWithoutExtension = uploadResult.public_id; 
            thumbnailUrl = cloudinary.url(publicIdWithoutExtension, {
                resource_type: 'image', 
                format: 'jpg',          
                quality: 'auto',        
                fetch_format: 'auto'    
            });
            console.log('✅ Video Thumbnail URL:', thumbnailUrl);
        }

        // Retourne l'URL du média principal et l'URL de la miniature (si vidéo)
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
        console.error('❌ Cloudinary Upload Error (Détails):', error); // Plus de détails dans le log
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
