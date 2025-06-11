// netlify/functions/delete-tip.mjs

// Suppression de l'import de 'node-fetch' car 'fetch' est globalement disponible dans Netlify Functions

export default async (event, context) => {
    // --- NOUVEAU LOG POUR DÉBOGAGE ---
    // Log l'objet event complet pour inspecter la méthode HTTP et autres paramètres
    console.log('📡 deleteTip: Requête reçue. Objet event:', JSON.stringify(event, null, 2));

    // --- Gérer la requête de pré-vérification CORS (méthode OPTIONS) ---
    // Les navigateurs envoient une requête OPTIONS avant une requête HTTP complexe (comme DELETE)
    // pour vérifier si le serveur autorise la requête réelle.
    if (event.httpMethod === 'OPTIONS') {
        console.log('📡 deleteTip: Méthode OPTIONS détectée. Réponse CORS preflight.');
        return new Response(null, {
            status: 204, // Code de statut "No Content" pour une réponse OPTIONS réussie
            headers: {
                'Access-Control-Allow-Origin': '*', // Autorise toutes les origines
                'Access-Control-Allow-Methods': 'DELETE, POST, GET, OPTIONS', // Méthodes HTTP autorisées
                'Access-Control-Allow-Headers': 'Content-Type, Authorization', // En-têtes HTTP autorisés
                'Access-Control-Max-Age': '86400', // Cache la réponse preflight pour 24 heures
            },
        });
    }

    // Vérifier la méthode HTTP pour s'assurer que c'est un DELETE
    if (event.httpMethod !== 'DELETE') {
        console.error(`❌ deleteTip: Méthode non autorisée reçue: ${event.httpMethod}. Seule DELETE est acceptée.`);
        return new Response(JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez DELETE.' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { id } = event.queryStringParameters; // Récupérer l'ID du tip depuis les paramètres de l'URL

    if (!id) {
        console.error("❌ deleteTip: ID manquant dans les paramètres de la requête.");
        return new Response(JSON.stringify({ success: false, message: "ID du tip manquant. Impossible de supprimer." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Il est recommandé d'utiliser process.env.GITHUB_PAT pour les tokens avec des droits d'écriture
        const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT; // Fallback pour GITHUB_PAT
        const repoOwner = "spiresm"; // REMPLACER par votre nom d'utilisateur GitHub si différent
        const repoName = "IA_marketing"; // REMPLACER par le nom exact de votre dépôt
        const filePath = "all-tips.json"; // Le chemin complet du fichier all-tips.json dans le dépôt
        const branch = 'main'; // La branche de votre dépôt (ex: 'main' ou 'master')

        if (!token) {
            console.error("❌ GITHUB_TOKEN ou GITHUB_PAT manquant pour deleteTip. Veuillez le configurer.");
            return new Response(JSON.stringify({ success: false, message: "Token GitHub manquant. Impossible de supprimer le tip. Contactez l'administrateur." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`📡 deleteTip: Tentative de suppression du tip ID: ${id} sur GitHub.`);

        // --- Étape 1 : Obtenir le SHA actuel du fichier all-tips.json ---
        // L'API GitHub DELETE requiert le SHA du fichier que vous voulez supprimer.
        // Nous devons d'abord faire un GET sur le fichier pour récupérer son SHA et le contenu actuel.
        const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`;
        console.log(`📡 deleteTip: Récupération du SHA et du contenu pour ${getFileUrl}`);

        const fileInfoRes = await fetch(getFileUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3.raw", // Demander le contenu brut directement
                "User-Agent": "Netlify-Function-deleteTip"
            },
        });

        if (!fileInfoRes.ok) {
            if (fileInfoRes.status === 404) {
                console.warn(`Le fichier ${filePath} n'existe pas. Impossible de supprimer le tip ${id}.`);
                return new Response(JSON.stringify({ success: false, message: `Le fichier des tips n'existe pas. Impossible de supprimer le tip ${id}.` }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            const errorText = await fileInfoRes.text();
            let errorMessage = `Erreur GitHub lors de la récupération du SHA/contenu du fichier: ${fileInfoRes.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage += ` - ${errorText.substring(0, 200)}... (non-JSON)`;
            }
            console.error(`❌ deleteTip: ${errorMessage}`);
            return new Response(JSON.stringify({ success: false, message: `Impossible de récupérer les informations du fichier des tips pour la suppression: ${errorMessage}` }), {
                status: fileInfoRes.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const currentContent = await fileInfoRes.text(); // Le contenu est déjà brut (texte)
        const currentTipsData = JSON.parse(currentContent);

        // Obtenir le SHA du fichier directement à partir des en-têtes ou d'une autre requête si nécessaire.
        // L'API "getContents" renvoie le SHA dans le corps JSON si Accept est 'application/vnd.github.v3+json'.
        // Si Accept est 'application/vnd.github.v3.raw', on ne reçoit que le contenu.
        // Pour être cohérent avec deletePrompt, faisons un appel pour obtenir le SHA séparément si nécessaire.
        // Alternativement, on peut changer 'Accept' pour 'application/vnd.github.v3+json' et parser le JSON.
        // Pour simplifier et rester proche de deletePrompt, faisons une requête HEAD ou GET séparée si nécessaire.
        // Cependant, l'approche la plus simple est de changer le type d'acceptation de la première requête.
        // Utilisons getContents avec 'application/vnd.github.v3+json' pour récupérer SHA et content ensemble.

        const getFileMetaUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`;
        const fileMetaRes = await fetch(getFileMetaUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json", // Demander le JSON pour le SHA
                "User-Agent": "Netlify-Function-deleteTip"
            },
        });

        if (!fileMetaRes.ok) {
            const errorText = await fileMetaRes.text();
            console.error(`❌ deleteTip: Erreur lors de la récupération des métadonnées du fichier: ${fileMetaRes.status} - ${errorText}`);
            return new Response(JSON.stringify({ success: false, message: `Impossible de récupérer les métadonnées du fichier pour la suppression.` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const fileMetaData = await fileMetaRes.json();
        const fileSha = fileMetaData.sha;


        if (!fileSha) {
            console.error(`❌ deleteTip: SHA du fichier ${filePath} introuvable.`);
            return new Response(JSON.stringify({ success: false, message: `SHA du fichier des tips introuvable. Impossible de supprimer.` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`✅ deleteTip: SHA du fichier ${filePath} récupéré: ${fileSha}`);

        // Filtrer la liste pour retirer le tip avec l'ID donné
        const initialLength = currentTipsData.length;
        const updatedTips = currentTipsData.filter(tip => String(tip.id) !== String(id)); // Convertir en String pour comparaison fiable
        console.log(`Tentative de suppression du tip ID: ${id}. Tips avant: ${initialLength}, Tips après: ${updatedTips.length}`);

        if (updatedTips.length === initialLength) {
            console.warn(`Tip avec l'ID ${id} non trouvé ou aucune modification effectuée.`);
            return new Response(JSON.stringify({ success: false, message: `Tip avec l'ID ${id} non trouvé.` }), {
                status: 404, // "Not Found" car la ressource spécifique n'a pas été trouvée pour être supprimée
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Préparer le nouveau contenu JSON (encodé en base64)
        const newContentBase64 = Buffer.from(JSON.stringify(updatedTips, null, 2)).toString('base64');

        // --- Étape 2 : Envoyer la requête PUT pour mettre à jour le fichier all-tips.json sur GitHub ---
        // L'API GitHub pour modifier un fichier est PUT, pas DELETE.
        // La méthode DELETE est pour supprimer le fichier lui-même, pas son contenu.
        const updateApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        console.log(`📡 deleteTip: Envoi de la requête PUT pour mettre à jour ${updateApiUrl}`);

        const updateRes = await fetch(updateApiUrl, {
            method: "PUT", // Utilisation de PUT pour mettre à jour le contenu du fichier
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "Netlify-Function-deleteTip"
            },
            body: JSON.stringify({
                message: `Suppression du tip: ${id}`, // Message de commit
                content: newContentBase64, // Le nouveau contenu du fichier
                sha: fileSha, // Le SHA de la version du fichier que nous modifions (obligatoire)
                branch: branch,
            }),
        });

        if (!updateRes.ok) {
            const errorText = await updateRes.text();
            let errorMessage = `Erreur GitHub lors de la mise à jour du fichier: ${updateRes.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage += ` - ${errorText.substring(0, 200)}... (non-JSON)`;
            }
            console.error(`❌ deleteTip: ${errorMessage}`);
            return new Response(JSON.stringify({ success: false, message: `Erreur lors de la suppression du tip sur GitHub: ${errorMessage}` }), {
                status: updateRes.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`✅ deleteTip: Fichier ${filePath} mis à jour avec succès sur GitHub (tip ${id} supprimé du contenu).`);

        // --- Déclencher un nouveau déploiement sur Netlify ---
        // C'est crucial pour que les changements dans all-tips.json soient propagés sur votre site live.
        const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
        if (buildHookUrl) {
            console.log('📡 Déclenchement du build hook Netlify...');
            const buildResponse = await fetch(buildHookUrl, { method: 'POST' });
            if (!buildResponse.ok) {
                console.error(`❌ Échec du déclenchement du build hook Netlify: ${buildResponse.status} ${buildResponse.statusText}`);
            } else {
                console.log('✅ Build hook Netlify déclenché avec succès.');
            }
        } else {
            console.warn('⚠️ La variable NETLIFY_BUILD_HOOK_URL n\'est pas configurée. Un déploiement manuel sera nécessaire pour voir les changements.');
        }

        return new Response(JSON.stringify({ success: true, message: `Tip ${id} supprimé avec succès et déploiement déclenché.` }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // CORS
                "Access-Control-Allow-Methods": "DELETE, POST, GET, OPTIONS", // Assurez-vous que les méthodes sont autorisées dans netlify.toml
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
        });

    } catch (error) {
        console.error('❌ deleteTip: Erreur générale lors de la suppression du tip :', error);
        return new Response(JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la suppression du tip: ${error.message}` }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*"
            },
        });
    }
};
