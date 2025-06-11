// netlify/functions/delete-tip.mjs
import fetch from 'node-fetch'; // Assurez-vous que 'node-fetch' est installé (npm install node-fetch)

export const handler = async (event) => {
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body); // Le frontend envoie l'ID dans le body, pas la query string pour delete-tip.mjs

    // Vérifier la méthode HTTP pour s'assurer que c'est un DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez DELETE.' }),
        };
    }

    // Récupérer l'ID du tip depuis le corps de la requête (comme vos logs l'indiquent)
    let id;
    try {
        const data = JSON.parse(event.body);
        id = data.id;
        console.log("ID extrait du corps:", id);
    } catch (parseError) {
        console.error("❌ delete-tip: Erreur de parsing du corps de la requête JSON:", parseError);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "Format de requête invalide. Le corps doit être un JSON avec un 'id'." }),
        };
    }

    if (!id) {
        console.error("❌ delete-tip: ID manquant dans le corps de la requête.");
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "ID du tip manquant. Impossible de supprimer." }),
        };
    }

    try {
        // --- Variables de configuration GitHub ---
        // Assurez-vous que ces variables d'environnement sont configurées sur Netlify
        // GITHUB_TOKEN (avec les droits de suppression sur le dépôt)
        // GITHUB_OWNER et GITHUB_REPO (le propriétaire et le nom de votre dépôt)
        // TIPS_FOLDER_PATH (le dossier où vos fichiers de tips sont stockés, ex: "tips" ou "data/tips")
        const token = process.env.GITHUB_TOKEN;
        const repoOwner = process.env.GITHUB_OWNER || "spiresm"; // Utilisez votre propriétaire de dépôt réel
        const repoName = process.env.GITHUB_REPO || "IA_marketing"; // Utilisez le nom de votre dépôt réel
        const tipsFolderPath = process.env.TIPS_FOLDER_PATH || "tips"; // <--- A MODIFIER si votre dossier de tips est différent !

        if (!token) {
            console.error("❌ delete-tip: GITHUB_TOKEN manquant. Veuillez le configurer.");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: "GITHUB_TOKEN manquant. Impossible de supprimer le tip. Contactez l'administrateur." }),
            };
        }

        // Reconstruire le nom du fichier complet avec l'extension
        // Si vos IDs incluent déjà l'extension (ex: "tip-123.json"), vous pouvez laisser juste `${id}`.
        // Sinon, ajoutez l'extension appropriée (ex: ".json" ou ".md").
        const fileName = `${id}.json`; // <--- A MODIFIER si l'extension est différente ! (ex: `${id}.md`)
        const filePath = `${tipsFolderPath}/${fileName}`; // Le chemin complet du fichier dans le dépôt

        console.log(`📡 delete-tip: Tentative de suppression du fichier ${filePath} (ID: ${id}) sur GitHub.`);

        // --- Étape 1 : Obtenir le SHA actuel du fichier ---
        // L'API GitHub DELETE requiert le SHA du fichier que vous voulez supprimer.
        // Nous devons d'abord faire un GET sur le fichier pour récupérer son SHA.
        const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        console.log(`📡 delete-tip: Récupération du SHA pour ${getFileUrl}`);

        const fileInfoRes = await fetch(getFileUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Netlify-Function-deleteTip" // Nom d'agent utilisateur
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
            console.error(`❌ delete-tip: ${errorMessage}`);
            // Gérer le cas où le fichier n'existe pas (404) comme un succès de suppression ( idempotent )
            if (fileInfoRes.status === 404) {
                 console.log(`✅ delete-tip: Fichier ${fileName} introuvable sur GitHub (déjà supprimé ?). Traitement comme succès.`);
                 return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: true, message: `Tip ${id} déjà supprimé ou introuvable.` }),
                 };
            }
            return {
                statusCode: fileInfoRes.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Impossible de récupérer les informations du fichier (${id}) pour la suppression: ${errorMessage}` }),
            };
        }

        const fileData = await fileInfoRes.json();
        const fileSha = fileData.sha; // C'est le SHA dont nous avons besoin pour la suppression

        if (!fileSha) {
            console.error(`❌ delete-tip: SHA du fichier ${filePath} introuvable.`);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `SHA du fichier ${id} introuvable. Impossible de supprimer.` }),
            };
        }

        console.log(`✅ delete-tip: SHA du fichier ${filePath} récupéré: ${fileSha}`);

        // --- Étape 2 : Envoyer la requête DELETE à GitHub ---
        const deleteApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        console.log(`📡 delete-tip: Envoi de la requête DELETE à ${deleteApiUrl}`);

        const deleteRes = await fetch(deleteApiUrl, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json", // Important pour les requêtes POST/PUT/DELETE
                "User-Agent": "Netlify-Function-deleteTip"
            },
            body: JSON.stringify({
                message: `Suppression du tip: ${fileName}`, // Message de commit sur GitHub
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
            console.error(`❌ delete-tip: ${errorMessage}`);
            return {
                statusCode: deleteRes.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Erreur lors de la suppression du tip sur GitHub: ${errorMessage}` }),
            };
        }

        console.log(`✅ delete-tip: Fichier ${fileName} supprimé avec succès sur GitHub.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // Important pour les requêtes CORS depuis votre frontend
                "Access-Control-Allow-Methods": "DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ success: true, message: `Tip ${id} supprimé avec succès.` }),
        };

    } catch (error) {
        console.error('❌ delete-tip: Erreur générale lors de la suppression du tip :', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*" // CORS
            },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la suppression du tip: ${error.message}` }),
        };
    } finally {
        console.log("------------------- Fin de l'exécution de delete-tip.mjs -------------------");
    }
};
