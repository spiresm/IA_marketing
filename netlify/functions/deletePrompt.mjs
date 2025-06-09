import { Octokit } from "@octokit/rest";
// Assurez-vous d'avoir node-fetch pour les appels fetch si Octokit ne l'inclut pas par défaut ou si vous l'utilisez ailleurs.
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

        const { promptPath, imagePath } = JSON.parse(event.body);

        const [owner, repo] = ["spiresm", "IA_marketing"];

        console.log("🔍 Suppression demandée pour :");
        console.log("Prompt chemin :", promptPath);
        console.log("Image chemin :", imagePath);

        // Fonction utilitaire pour supprimer un fichier
        async function deleteFileFromGitHub(filePath, messagePrefix) {
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

                // Assurez-vous que fileData est bien un objet de fichier et non un tableau (si le chemin est un dossier)
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

                if (status === 404 && githubMessage.includes("Not Found")) {
                    console.warn(`⚠️ ${messagePrefix} déjà absent ou non trouvé : ${filePath}`);
                } else {
                    console.error(`❌ Erreur lors de la suppression de ${filePath} : ${githubMessage}`, err);
                    // Renvoyer l'erreur pour qu'elle soit attrapée par le bloc catch principal
                    throw new Error(`Échec de la suppression de ${filePath}: ${githubMessage}`);
                }
            }
        }

        // Supprimer le fichier prompt
        await deleteFileFromGitHub(promptPath, 'Suppression prompt');

        // Supprimer l'image liée
        await deleteFileFromGitHub(imagePath, 'Suppression image');


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
