// netlify/functions/uploadMedia.js

const cloudinary = require('cloudinary').v2; // Importe la SDK Cloudinary
const { Buffer } = require('buffer'); // Pour gérer les données base64

// Configuration Cloudinary (à prendre de vos variables d'environnement Netlify)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
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

    // Détecter le type de média (image ou vidéo) par l'extension ou par un paramètre si envoyé par le client
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const resourceType = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'].includes(fileExtension) ? 'video' : 'image';
    const uploadOptions = {
        folder: 'ia_marketing_uploads', // Dossier dans Cloudinary pour organiser vos médias
        resource_type: resourceType,
        public_id: `${Date.now()}_${fileName.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '')}`, // ID public unique
        // Pour les vidéos, vous pouvez ajouter des options de transformation par défaut ici, par exemple:
        // transformation: resourceType === 'video' ? [{ quality: "auto", fetch_format: "auto" }] : undefined
    };

    // Upload du fichier vers Cloudinary
    console.log(`📡 uploadMedia: Tentative d'upload vers Cloudinary (${resourceType})...`);
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${fileContent}`, // Ou `data:image/jpeg;base64,` pour les images
      uploadOptions
    );

    console.log(`✅ uploadMedia: Fichier uploadé sur Cloudinary: ${uploadResult.secure_url}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ url: uploadResult.secure_url, public_id: uploadResult.public_id, resource_type: uploadResult.resource_type }),
    };

  } catch (error) {
    console.error('❌ uploadMedia: Erreur lors de l\'upload vers Cloudinary:', error);
    // Gérer les erreurs spécifiques de Cloudinary ou autres
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Erreur d'upload de média: ${error.message || 'Une erreur inconnue est survenue.'}` }),
    };
  }
};
