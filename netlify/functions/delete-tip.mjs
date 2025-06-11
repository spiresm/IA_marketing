// netlify/functions/delete-tip.mjs
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event) => {
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body);

    // Vérifier la méthode HTTP pour s'assurer que c'est un DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez DELETE.' }),
        };
    }

    // Récupérer l'ID du tip depuis le corps de la requête
    let idToDelete;
    try {
        const data = JSON.parse(event.body);
        idToDelete = data.id;
        console.log("ID extrait du corps à supprimer:", idToDelete);
    } catch (parseError) {
        console.error("❌ delete-tip: Erreur de parsing du corps de la requête JSON:", parseError);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "Format de requête invalide. Le corps doit être un JSON avec un 'id'." }),
        };
    }

    if (!idToDelete) {
        console.error("❌ delete-tip: ID manquant dans le corps de la requête.");
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: "ID du tip manquant. Impossible de supprimer." }),
        };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    // Utiliser le même chemin de fichier que save-tip.mjs
    const TIPS_FILE_PATH = process.env.TIPS_FILE_PATH || 'data/all-tips.json'; 

    if (!GITHUB_TOKEN || !OWNER || !REPO) {
        console.error("❌ delete-tip: Configuration de l'API GitHub (TOKEN, OWNER, REPO) manquante.");
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Configuration de l\'API GitHub manquante. Contactez l\'administrateur.' }),
        };
    }

    const octokit = new MyOctokit({ auth: GITHUB_TOKEN });

    try {
        // --- Étape 1 : Récupérer le contenu actuel du fichier all-tips.json ---
        console.log(`📡 delete-tip: Récupération du fichier: ${TIPS_FILE_PATH}`);
        let fileData;
        let existingTips = [];
        let fileSha;

        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main', // Ou la branche que vous utilisez
            });
            fileData = response.data;
            fileSha = fileData.sha;
            const content = Buffer.from(fileData.content, 'base64').toString('utf8');
            existingTips = JSON.parse(content);
            console.log(`✅ delete-tip: Fichier ${TIPS_FILE_PATH} récupéré. ${existingTips.length} tips trouvés.`);
        } catch (error) {
            if (error.status === 404) {
                // Le fichier n'existe pas. Si le tip n'est pas là non plus, c'est comme un succès.
                console.log(`✅ delete-tip: Le fichier ${TIPS_FILE_PATH} n'existe pas sur GitHub. Si le tip n'existait pas non plus, c'est un succès.`);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: true, message: `Tip ${idToDelete} déjà supprimé ou introuvable (fichier non trouvé).` }),
                };
            } else {
                throw error; // Lancer d'autres erreurs de récupération
            }
        }

        // --- Étape 2 : Filtrer le tip à supprimer du tableau ---
        const initialLength = existingTips.length;
        const updatedTips = existingTips.filter(tip => tip.id !== idToDelete);

        if (updatedTips.length === initialLength) {
            console.log(`✅ delete-tip: Tip avec ID ${idToDelete} non trouvé dans le fichier. Pas de suppression nécessaire.`);
            return {
                statusCode: 200, // Le tip n'est pas là, donc objectif atteint.
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, message: `Tip ${idToDelete} non trouvé dans le fichier, pas de suppression nécessaire.` }),
            };
        }

        console.log(`📡 delete-tip: Suppression de l'ID ${idToDelete}. Ancien nombre: ${initialLength}, Nouveau nombre: ${updatedTips.length}`);

        // --- Étape 3 : Mettre à jour le fichier all-tips.json sur GitHub ---
        const newContent = Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64');
        
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Suppression du tip avec l'ID ${idToDelete}`,
            content: newContent,
            sha: fileSha, // Utiliser le SHA de la version récupérée pour éviter les conflits
            branch: 'main' // Assurez-vous que c'est la bonne branche
        });

        console.log(`✅ delete-tip: Fichier ${TIPS_FILE_PATH} mis à jour sur GitHub. Tip ${idToDelete} supprimé.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // CORS pour votre frontend
                "Access-Control-Allow-Methods": "DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ success: true, message: `Tip ${idToDelete} supprimé avec succès.` }),
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
