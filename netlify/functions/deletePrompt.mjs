import fetch from 'node-fetch';

export const handler = async (event) => {
    // Vérifier la méthode HTTP pour s'assurer que c'est un DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez DELETE.' }),
        };
    }

    const { id } = event.queryStringParameters; // Récupérer l'ID du prompt depuis les paramètres de l'URL

    if (!id) {
        console.error("❌ deletePrompt: ID manquant dans les paramètres de la requête.");
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "ID du prompt manquant. Impossible de supprimer." }),
        };
    }

    try {
        const token = process.env.GITHUB_TOKEN;
        const repoOwner = "spiresm";
        const repoName = "IA_marketing";
        const promptsFolderPath = "prompts";

        if (!token) {
            console.error("❌ GITHUB_TOKEN manquant pour deletePrompt. Veuillez le configurer.");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: "GITHUB_TOKEN manquant. Impossible de supprimer le prompt. Contactez l'administrateur." }),
            };
        }

        const fileName = `${id}.json`; // Reconstruire le nom du fichier complet avec l'extension
        const filePath = `${promptsFolderPath}/${fileName}`; // Le chemin complet du fichier dans le dépôt

        console.log(`📡 deletePrompt: Tentative de suppression du fichier ${filePath} (ID: ${id}) sur GitHub.`);

        // --- Étape 1 : Obtenir le SHA actuel du fichier ---
        // L'API GitHub DELETE requiert le SHA du fichier que vous voulez supprimer.
        // Nous devons d'abord faire un GET sur le fichier pour récupérer son SHA.
        const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        console.log(`📡 deletePrompt: Récupération du SHA pour ${getFileUrl}`);

        const fileInfoRes = await fetch(getFileUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Netlify-Function-deletePrompt"
            },
        });

        if (!fileInfoRes.ok) {
            const errorText = await fileInfoRes.text();
            let errorMessage = `Erreur GitHub lors de la récupération du SHA du fichier: ${fileInfoRes.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage += ` - ${errorText.substring(0, 200)}... (non-JSON)`;
            }
            console.error(`❌ deletePrompt: ${errorMessage}`);
            return {
                statusCode: fileInfoRes.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Impossible de récupérer les informations du fichier (${id}) pour la suppression: ${errorMessage}` }),
            };
        }

        const fileData = await fileInfoRes.json();
        const fileSha = fileData.sha; // C'est le SHA dont nous avons besoin pour la suppression

        if (!fileSha) {
            console.error(`❌ deletePrompt: SHA du fichier ${filePath} introuvable.`);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `SHA du fichier ${id} introuvable. Impossible de supprimer.` }),
            };
        }

        console.log(`✅ deletePrompt: SHA du fichier ${filePath} récupéré: ${fileSha}`);

        // --- Étape 2 : Envoyer la requête DELETE à GitHub ---
        const deleteApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        console.log(`📡 deletePrompt: Envoi de la requête DELETE à ${deleteApiUrl}`);

        const deleteRes = await fetch(deleteApiUrl, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json", // Important pour les requêtes POST/PUT/DELETE
                "User-Agent": "Netlify-Function-deletePrompt"
            },
            body: JSON.stringify({
                message: `Suppression du prompt: ${fileName}`, // Message de commit
                sha: fileSha, // Le SHA du fichier que nous venons de récupérer
            }),
        });

        if (!deleteRes.ok) {
            const errorText = await deleteRes.text();
            let errorMessage = `Erreur GitHub lors de la suppression du fichier: ${deleteRes.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage += ` - ${errorText.substring(0, 200)}... (non-JSON)`;
            }
            console.error(`❌ deletePrompt: ${errorMessage}`);
            return {
                statusCode: deleteRes.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Erreur lors de la suppression du prompt sur GitHub: ${errorMessage}` }),
            };
        }

        console.log(`✅ deletePrompt: Fichier ${fileName} supprimé avec succès sur GitHub.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // CORS
                "Access-Control-Allow-Methods": "DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ success: true, message: `Prompt ${id} supprimé avec succès.` }),
        };

    } catch (error) {
        console.error('❌ deletePrompt: Erreur générale lors de la suppression du prompt :', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*" // CORS
            },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la suppression du prompt: ${error.message}` }),
        };
    }
};
