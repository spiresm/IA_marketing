// netlify/functions/delete-tip.mjs
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Buffer } from 'buffer';
import fetch from 'node-fetch'; // <--- NOUVEL IMPORT NÉCESSAIRE

const MyOctokit = Octokit.plugin(restEndpointMethods);

export const handler = async (event) => {
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body);

    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez DELETE.' }),
        };
    }

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
        // --- Étape 1 : Récupérer les métadonnées ou le contenu direct du fichier all-tips.json ---
        console.log(`📡 delete-tip: Récupération des métadonnées du fichier: ${TIPS_FILE_PATH}`);
        let fileMetadata;
        let fileSha;
        let content;
        let existingTips = [];

        try {
            const response = await octokit.rest.repos.getContent({
                owner: OWNER,
                repo: REPO,
                path: TIPS_FILE_PATH,
                ref: 'main',
            });
            fileMetadata = response.data;
            fileSha = fileMetadata.sha; // Le SHA est toujours là, même sans le contenu direct

            console.log('✅ delete-tip: Métadonnées du fichier récupérées de GitHub.');
            // console.log('📡 delete-tip: Réponse complète de GitHub (métadonnées):', JSON.stringify(fileMetadata, null, 2)); // Décommenter pour debug

            // Vérifier si le contenu est directement présent ou si nous devons utiliser download_url
            if (fileMetadata.content && fileMetadata.encoding === 'base64') {
                console.log('📡 delete-tip: Contenu directement présent (taille < 1MB).');
                content = Buffer.from(fileMetadata.content, 'base64').toString('utf8');
            } else if (fileMetadata.download_url) {
                console.log(`📡 delete-tip: Contenu non direct (taille >= 1MB ou encodage "none"). Utilisation de download_url: ${fileMetadata.download_url}`);
                const rawResponse = await fetch(fileMetadata.download_url);
                if (!rawResponse.ok) {
                    throw new Error(`Failed to download raw content: ${rawResponse.statusText}`);
                }
                content = await rawResponse.text();
                console.log(`✅ delete-tip: Contenu téléchargé via download_url. Longueur: ${content.length}`);
            } else {
                console.error('❌ delete-tip: Réponse GitHub inattendue, ni content ni download_url disponibles.');
                throw new Error('Impossible de récupérer le contenu du fichier tips: Format de réponse GitHub inattendu.');
            }

            existingTips = JSON.parse(content);
            console.log(`✅ delete-tip: Fichier ${TIPS_FILE_PATH} récupéré et parsé. ${existingTips.length} tips trouvés.`);

        } catch (error) {
            if (error.status === 404) {
                console.log(`✅ delete-tip: Le fichier ${TIPS_FILE_PATH} n'existe pas sur GitHub. Aucun tip à supprimer.`);
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: true, message: `Tip ${idToDelete} déjà supprimé ou introuvable (fichier non trouvé).` }),
                };
            } else if (error instanceof SyntaxError) {
                console.error('⚠️ delete-tip: Erreur de parsing JSON après récupération du fichier. Le contenu était probablement incomplet ou mal formé.');
                throw new Error(`Erreur de parsing JSON du fichier tips: ${error.message}`);
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
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true, message: `Tip ${idToDelete} non trouvé dans le fichier, pas de suppression nécessaire.` }),
            };
        }

        console.log(`📡 delete-tip: Suppression de l'ID ${idToDelete}. Ancien nombre: ${initialLength}, Nouveau nombre: ${updatedTips.length}`);

        // --- Étape 3 : Mettre à jour le fichier sur GitHub ---
        const newContent = Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64');
        
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: TIPS_FILE_PATH,
            message: `Suppression du tip avec l'ID ${idToDelete}`,
            content: newContent,
            sha: fileSha, // Utiliser le SHA de la version récupérée pour éviter les conflits
            branch: 'main'
        });

        console.log(`✅ delete-tip: Fichier ${TIPS_FILE_PATH} mis à jour sur GitHub. Tip ${idToDelete} supprimé.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "DELETE, OPTIONS", // Ajout de OPTIONS pour CORS
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ success: true, message: `Tip ${idToDelete} supprimé avec succès.` }),
        };

    } catch (error) {
        console.error('❌ delete-tip: Erreur générale lors de la suppression du tip:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la suppression du tip: ${error.message}` }),
        };
    } finally {
        console.log("------------------- Fin de l'exécution de delete-tip.mjs -------------------");
    }
};
