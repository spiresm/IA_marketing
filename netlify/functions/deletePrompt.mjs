import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
            },
            body: "",
        };
    }

    try {
        if (!event.body) {
            console.error("❌ deletePrompt: Aucune donnée reçue (body vide)");
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Aucune donnée reçue pour la suppression" }),
            };
        }

        // On déstructure maintenant promptSha et imageSha aussi
        const { promptPath, promptSha, imagePath, imageSha } = JSON.parse(event.body);

        const [owner, repo] = ["spiresm", "IA_marketing"];

        console.log("🔍 Suppression demandée pour :");
        console.log("Prompt chemin :", promptPath, "SHA:", promptSha);
        console.log("Image chemin :", imagePath, "SHA:", imageSha);

        // Fonction utilitaire pour supprimer un fichier
        // Elle prend maintenant le SHA directement en argument
        async function deleteFileFromGitHub(filePath, fileSha, messagePrefix) {
            if (!filePath || !fileSha) {
                console.log(`ℹ️ ${messagePrefix} : Chemin ou SHA vide, skipping.`);
                return;
            }

            try {
                // Étape 1: Supprimer le fichier en utilisant le SHA fourni
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: filePath,
                    message: `${messagePrefix} ${filePath}`,
                    sha: fileSha, // <-- Utilise le SHA passé en argument
                });
                console.log(`✅ ${messagePrefix} supprimé : ${filePath}`);
            } catch (err) {
                const status = err.status || 500;
                const githubMessage = err.response?.data?.message || err.message;

                if (status === 404 && githubMessage.includes("Not Found") && githubMessage.includes("no file at this path")) {
                    console.warn(`⚠️ ${messagePrefix} déjà absent ou non trouvé : ${filePath}`);
                } else {
                    console.error(`❌ Erreur lors de la suppression de ${filePath} : ${githubMessage}`, err);
                    throw new Error(`Échec de la suppression de ${filePath}: ${githubMessage}`);
                }
            }
        }

        // Supprimer le fichier prompt
        await deleteFileFromGitHub(promptPath, promptSha, 'Suppression prompt');

        // Supprimer l'image liée (si imagePath et imageSha sont fournis)
        // Note: imageUrl n'est pas le chemin complet pour GitHub, il faut le convertir
        // Côté client, assurez-vous d'envoyer le CHEMIN RELATIF DE L'IMAGE DANS LE DÉPÔT GitHub.
        // Par exemple: 'images/MON_PROMPT.png'
        if (imagePath) { // Assurez-vous que l'imagePath est le chemin relatif dans le repo
            // Pour l'image, il faut aussi faire un getContent si on a pas le SHA
            // ou s'assurer que le client envoie bien le SHA de l'image.
            // Si le client n'envoie que imageUrl, il faut faire un getContent pour l'image aussi.
            // C'est plus simple de laisser le `deleteFileFromGitHub` faire un `getContent` pour les images
            // si le client n'envoie pas le SHA de l'image.

            // Solution 1: Le client envoie aussi imageSha
            await deleteFileFromGitHub(imagePath, imageSha, 'Suppression image');

            // Solution 2: (Si le client n'envoie pas imageSha, on le récupère comme avant)
            // await deleteFileFromGitHubWithContentFetch(imagePath, 'Suppression image');
        }


        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ success: true, message: "Prompts et/ou images supprimés avec succès." }),
        };

    } catch (err) {
        const msg = err.message || "Erreur inconnue";
        console.error("❌ Erreur générale dans deletePrompt:", msg);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ error: `Erreur interne du serveur lors de la suppression: ${msg}` }),
        };
    }
}

// Version de la fonction deleteFileFromGitHub qui inclut le getContent pour récupérer le SHA
// C'est celle que vous aviez, elle est robuste si le SHA n'est pas toujours disponible côté client
async function deleteFileFromGitHubWithContentFetch(filePath, messagePrefix) {
    const [owner, repo] = ["spiresm", "IA_marketing"]; // Définir ici aussi pour cette fonction

    if (!filePath) {
        console.log(`ℹ️ ${messagePrefix} : Chemin vide, skipping.`);
        return;
    }

    try {
        // Étape 1: Obtenir les métadonnées du fichier (nécessaire pour le SHA)
        console.log(`fetching content for ${filePath}`);
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
        });
        console.log(`Content data for ${filePath}:`, fileData);

        if (Array.isArray(fileData)) {
            console.error(`❌ ${messagePrefix}: Le chemin ${filePath} est un dossier, pas un fichier.`);
            throw new Error(`Le chemin '${filePath}' correspond à un dossier, pas à un fichier.`);
        }

        // Étape 2: Supprimer le fichier en utilisant le SHA
        await octokit.repos.deleteFile({
            owner,
            repo,
            path: filePath,
            message: `${messagePrefix} ${filePath}`,
            sha: fileData.sha, // C'est crucial d'utiliser le SHA récupéré
        });
        console.log(`✅ ${messagePrefix} supprimé : ${filePath}`);
    } catch (err) {
        const status = err.status || 500;
        const githubMessage = err.response?.data?.message || err.message;

        if (status === 404 && githubMessage.includes("Not Found") && githubMessage.includes("no file at this path")) {
            console.warn(`⚠️ ${messagePrefix} déjà absent ou non trouvé : ${filePath}`);
        } else {
            console.error(`❌ Erreur lors de la suppression de ${filePath} : ${githubMessage}`, err);
            throw new Error(`Échec de la suppression de ${filePath}: ${githubMessage}`);
        }
    }
}
