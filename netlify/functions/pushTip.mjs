// netlify/functions/pushTip.mjs

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import multiparty from 'multiparty'; // Importez la bibliothèque

const MyOctokit = Octokit.plugin(restEndpointMethods);

export async function handler(event, context) {
    // ... (variables d'environnement et vérifications initiales inchangées) ...

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let fields;
    let files;
    let newTip = {}; // Initialisation de newTip
    let firstImageFile = null; // Pour stocker le premier fichier image trouvé

    // --- NOUVEAU : Parsing du multipart/form-data ---
    try {
        const form = new multiparty.Form();
        const { fields: parsedFields, files: parsedFiles } = await new Promise((resolve, reject) => {
            form.parse(event.body, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        fields = parsedFields;
        files = parsedFiles;

        // Mapper les champs du formulaire vers newTip
        for (const key in fields) {
            if (fields[key].length > 0) {
                newTip[key] = fields[key][0]; // Prend la première valeur pour chaque champ
            }
        }

        // Gérer les fichiers uploadés
        if (files && files.files && files.files.length > 0) { // 'files' est le nom du champ FormData côté client, ex: files[]
            firstImageFile = files.files.find(file => file.headers['content-type'].startsWith('image/'));
            if (firstImageFile) {
                // Pour Octokit, nous avons besoin des données en base64
                const imageBuffer = Buffer.from(firstImageFile.path); // multiparty écrit le fichier sur disque temporairement
                newTip.imageData = `data:<span class="math-inline">\{firstImageFile\.headers\['content\-type'\]\};base64,</span>{imageBuffer.toString('base64')}`;
                newTip.imageFileName = firstImageFile.originalFilename;
                console.log("📡 pushTip: Fichier image parsé:", newTip.imageFileName);
            } else {
                console.log("📡 pushTip: Aucun fichier image trouvé parmi les fichiers envoyés.");
            }
        }

    } catch (e) {
        console.error('❌ pushTip: Erreur de parsing du multipart/form-data:', e);
        return { statusCode: 400, body: JSON.stringify({ message: 'Corps de la requête invalide. Attendu multipart/form-data.' }) };
    }
    // --- FIN NOUVEAU PARSING ---

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });
    let uploadedImageUrl = null; // Pour stocker l'URL de l'image si elle est uploadée avec succès
    let uploadedImageUrls = []; // Pour stocker toutes les URLs d'images uploadées

    try {
        // --- DÉBUT : GESTION DE L'UPLOAD D'IMAGES (plusieurs) ---
        if (files && files.files && files.files.length > 0) {
            console.log(`📡 pushTip: ${files.files.length} fichiers trouvés, tentative d'upload sur GitHub...`);
            for (const file of files.files) {
                const mimeType = file.headers['content-type'];
                if (mimeType.startsWith('image/')) {
                    console.log(`📡 pushTip: Traitement de l'image: ${file.originalFilename}`);
                    const imageBuffer = Buffer.from(await fs.promises.readFile(file.path)); // Lire le fichier depuis le chemin temporaire
                    const base64Data = imageBuffer.toString('base64');

                    const uniqueFileName = `<span class="math-inline">\{Date\.now\(\)\}\-</span>{file.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    const imagePathInRepo = `<span class="math-inline">\{GITHUB\_IMAGE\_PATH\}/</span>{uniqueFileName}`;

                    try {
                        const uploadResponse = await octokit.rest.repos.createOrUpdateFileContents({
                            owner: OWNER,
                            repo: REPO,
                            path: imagePathInRepo,
                            message: `Ajout de l'image ${file.originalFilename} pour le tip: ${newTip.titre || 'Sans titre'}`,
                            content: base64Data,
                            branch: 'main',
                        });
                        const currentImageUrl = `https://raw.githubusercontent.com/<span class="math-inline">\{OWNER\}/</span>{REPO}/main/${imagePathInRepo}`;
                        uploadedImageUrls.push(currentImageUrl);
                        console.log(`✅ pushTip: Image uploadée avec succès: ${currentImageUrl}`);
                    } catch (imageUploadError) {
                        console.error(`❌ pushTip: Erreur lors de l'upload de l'image ${file.originalFilename} à GitHub:`, imageUploadError);
                    }
                } else {
                    console.log(`⚠️ pushTip: Fichier non-image ignoré: <span class="math-inline">\{file\.originalFilename\} \(</span>{mimeType})`);
                    // Vous pouvez ajouter ici la logique pour gérer les documents (pdf, txt) si nécessaire
                    // Par exemple, les uploader aussi et stocker leurs URLs
                }
            }
            newTip.imageUrls = uploadedImageUrls; // Stocke toutes les URLs dans un tableau
            // Si vous voulez une seule image de confirmation, prenez la première
            uploadedImageUrl = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null;
        }
        // --- FIN : GESTION DE L'UPLOAD D'IMAGES ---

        // ... (Reste du code pour récupérer, mettre à jour et sauvegarder all-tips.json) ...
        // Assurez-vous que le tip renvoyé à la fin inclut bien `imageUrls` si vous l'avez ajouté.
        // newTip.date_ajout = new Date().toISOString(); // Assurez-vous que cette ligne est toujours là

        const tipWithId = { id: Date.now().toString(), ...newTip };

        // ... (Récupération et mise à jour du fichier JSON) ...

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: 'Tip ajouté avec succès !', tip: tipWithId, imageUrl: uploadedImageUrl, imageUrls: uploadedImageUrls }),
        };

    } catch (error) {
        console.error('❌ pushTip: Erreur critique lors de l\'ajout du tip à GitHub:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Erreur interne du serveur lors de l'interaction avec GitHub: ${error.message}` }),
        };
    }
}
