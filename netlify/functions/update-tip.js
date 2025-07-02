// netlify/functions/update-tip.js
// ou netlify/functions/update-tip.mjs (si vous utilisez les modules ES6)

// Importations nécessaires pour FaunaDB, multiparty et les opérations de fichiers
const faunadb = require('faunadb');
const q = faunadb.query;
const multiparty = require('multiparty');
const fs = require('fs/promises'); // Utilisé pour lire les fichiers temporaires de multiparty
const { Readable } = require('stream'); // Nécessaire pour adapter le corps de l'événement pour multiparty

// Si vous utilisez Octokit pour la gestion des images GitHub, décommentez ces lignes
// const { Octokit } = require("@octokit/core");
// const { restEndpointMethods } = require("@octokit/plugin-rest-endpoint-methods");
// const MyOctokit = Octokit.plugin(restEndpointMethods);

exports.handler = async (event, context) => {
    // Gère les requêtes OPTIONS (preflight) pour CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*', // Autorise toutes les origines (à ajuster pour la production)
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS', // Autorise PUT, POST et OPTIONS
                'Access-Control-Allow-Headers': 'Content-Type', // Autorise l'en-tête Content-Type, et tout autre en-tête
                'Access-Control-Max-Age': '86400', // Cache les résultats du preflight pendant 24h
            },
            body: '' // Corps vide pour les requêtes OPTIONS
        };
    }

    // Vérifie si la méthode HTTP est PUT. Si ce n'est pas le cas, retourne une erreur 405.
    if (event.httpMethod !== 'PUT') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
            headers: {
                'Allow': 'PUT, OPTIONS', // Indique les méthodes autorisées pour cette ressource spécifique
                'Access-Control-Allow-Origin': '*',
            }
        };
    }

    let fields = {}; // Pour stocker les champs du formulaire textuels
    let files = {}; // Pour stocker les fichiers du formulaire uploadés

    // Préparation du stream de la requête pour multiparty
    const form = new multiparty.Form();
    const requestStream = new Readable();
    requestStream.push(event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8'));
    requestStream.push(null);
    requestStream.headers = event.headers;
    requestStream.method = event.httpMethod;

    try {
        // Parse la requête multipart/form-data
        await new Promise((resolve, reject) => {
            form.parse(requestStream, (err, parsedFields, parsedFiles) => {
                if (err) {
                    console.error('❌ updateTip: Erreur de parsing du formulaire multipart/form-data:', err);
                    return reject(err);
                }
                fields = parsedFields;
                files = parsedFiles;
                resolve();
            });
        });

        // Transforme les champs parsés par multiparty en un objet simple pour FaunaDB
        let tipData = {};
        for (const key in fields) {
            if (fields[key] && fields[key].length > 0) {
                // Gère spécifiquement le champ 'urls' qui est envoyé comme chaîne JSON
                if (key === 'urls') {
                    try {
                        tipData[key] = JSON.parse(fields[key][0]);
                    } catch (e) {
                        console.error(`❌ updateTip: Erreur de parsing du champ 'urls': ${fields[key][0]}`, e);
                        tipData[key] = []; // Assurez-vous que c'est un tableau vide en cas d'erreur
                    }
                } else {
                    tipData[key] = fields[key][0]; // Pour les autres champs, prend la première valeur
                }
            }
        }

        // Extrait l'ID du tip et le reste des champs à mettre à jour
        // Le SHA est ignoré ici car il est spécifique à GitHub et non à FaunaDB
        const { id, sha, ...fieldsToUpdate } = tipData; 

        if (!id) {
            console.warn('⚠️ updateTip: Requête de mise à jour reçue sans ID de tip.');
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing tip ID for update.' })
            };
        }

        // --- Gestion de l'image principale ---
        // Cette logique suppose que l'upload réel de l'image vers GitHub
        // est géré par une fonction `uploadImage` distincte appelée par le frontend.
        // `imageUrl` dans `fieldsToUpdate` devrait déjà contenir l'URL finale de l'image.
        
        // Si vous voulez que cette fonction gère l'upload d'images vers GitHub :
        // Décommentez les imports Octokit en haut.
        // const GITHUB_IMAGE_PATH_CONST = 'assets/images';
        // const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });
        // if (files && files.files && files.files.length > 0) {
        //     const file = files.files[0]; // Prend le premier fichier s'il y en a
        //     const fileBuffer = await fs.readFile(file.path);
        //     const base64Data = fileBuffer.toString('base64');
        //     const uniqueFileName = `${Date.now()}-${file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        //     const filePathInRepo = `${GITHUB_IMAGE_PATH_CONST}/${uniqueFileName}`;
        //     const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
        //         owner: process.env.GITHUB_OWNER,
        //         repo: process.env.GITHUB_REPO,
        //         path: filePathInRepo,
        //         message: `Mise à jour de l'image pour le tip ${id}`,
        //         content: base64Data,
        //         branch: 'main',
        //     });
        //     // Met à jour imageUrl avec la nouvelle URL de l'image uploadée
        //     fieldsToUpdate.imageUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/main/${filePathInRepo}`;
        //     fieldsToUpdate.fileUrls = [fieldsToUpdate.imageUrl]; // Mettez à jour fileUrls aussi
        // } else if (!fieldsToUpdate.imageUrl) {
        //     // Si pas de nouvelle image et pas d'ancienne URL fournie, assurez-vous que c'est vide
        //     fieldsToUpdate.imageUrl = '';
        //     fieldsToUpdate.fileUrls = [];
        // }


        // Mettre à jour la date de modification
        fieldsToUpdate.date_modification = new Date().toISOString();

        // Initialise le client FaunaDB
        const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

        console.log(`ℹ️ updateTip: Tentative de mise à jour du tip avec ID: ${id} dans FaunaDB.`);
        // Exécute la requête de mise à jour dans FaunaDB
        const updatedTip = await client.query(
            q.Update(
                q.Ref(q.Collection('tips'), id), // Référence au document par son ID dans la collection 'tips'
                { data: fieldsToUpdate } // Les données à mettre à jour
            )
        );

        console.log(`✅ updateTip: Tip ID ${id} mis à jour avec succès dans FaunaDB.`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            // Retourne l'ID et les données mises à jour pour que le frontend puisse les confirmer
            // Les `...updatedTip.data` incluront tous les champs mis à jour par FaunaDB
            body: JSON.stringify({ message: 'Tip updated successfully!', tip: { id: updatedTip.ref.id, ...updatedTip.data } }),
        };

    } catch (error) {
        // Gère spécifiquement les erreurs si le document n'est pas trouvé dans FaunaDB
        if (error.name === 'NotFound') {
            console.error(`❌ updateTip: Tip avec ID ${tipData.id} non trouvé dans FaunaDB.`, error);
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: `Tip with ID ${tipData.id} not found.` }),
            };
        }

        // Gère les erreurs de parsing de multiparty
        if (error.message && error.message.includes('Expected multipart/form-data')) {
             console.error('❌ updateTip: Erreur: Le Content-Type n\'est pas multipart/form-data comme attendu par multiparty.', error);
             return {
                 statusCode: 400,
                 headers: { 'Access-Control-Allow-Origin': '*' },
                 body: JSON.stringify({ message: `Erreur de requête: Le format de données n'est pas supporté (attendu: multipart/form-data).` }),
             };
         }
        
        console.error('❌ updateTip: Erreur générale lors de la mise à jour du tip ou du parsing:', error);
        return {
            statusCode: error.requestResult?.statusCode || 500, // Tente de récupérer le code d'état de l'erreur FaunaDB
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: `Erreur interne du serveur lors de la mise à jour du tip: ${error.message || 'Une erreur inconnue est survenue.'}` }),
        };
    }
};
