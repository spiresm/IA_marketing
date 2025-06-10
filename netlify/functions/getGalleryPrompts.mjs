import fetch from 'node-fetch';

export const handler = async (event) => {
    // Vérifier la méthode HTTP pour s'assurer que c'est un GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez GET.' }),
        };
    }

    try {
        const token = process.env.GITHUB_TOKEN; // Le même token que pour pushPrompt
        const repoOwner = "spiresm";
        const repoName = "IA_marketing";
        const promptsFolderPath = "prompts";

        if (!token) {
            console.error("❌ GITHUB_TOKEN manquant pour getGalleryPrompts. Veuillez le configurer dans les variables d'environnement Netlify.");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: "GITHUB_TOKEN manquant. Impossible de récupérer les prompts. Contactez l'administrateur." }),
            };
        }

        const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${promptsFolderPath}`;

        console.log(`📡 getGalleryPrompts: Tentative de récupération du contenu de ${promptsFolderPath} depuis le dépôt ${repoOwner}/${repoName} sur GitHub.`);

        const res = await fetch(githubApiUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Netlify-Function-getGalleryPrompts"
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `Erreur GitHub lors de la liste des fichiers: ${res.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage += ` - ${errorText.substring(0, 200)}... (non-JSON)`;
            }

            console.error(`❌ getGalleryPrompts: ${errorMessage}`);
            return {
                statusCode: res.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Erreur GitHub lors de la récupération de la liste des prompts: ${errorMessage}` }),
            };
        }

        const files = await res.json();

        if (!Array.isArray(files)) {
            console.error("❌ getGalleryPrompts: La réponse de GitHub n'est pas un tableau. Chemin incorrect ou API modifiée ?");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: "Réponse inattendue de GitHub. Le chemin du dossier des prompts est peut-être incorrect." }),
            };
        }

        const jsonFiles = files.filter(file => file.type === 'file' && file.name.endsWith('.json'));

        console.log(`📂 getGalleryPrompts: ${jsonFiles.length} fichiers JSON potentiels trouvés dans ${promptsFolderPath}.`);

        const allPrompts = [];

        for (const file of jsonFiles) {
            try {
                const fileContentRes = await fetch(file.download_url);
                if (fileContentRes.ok) {
                    const promptContent = await fileContentRes.json();
                    const promptId = file.name.replace('.json', ''); // L'ID est le nom du fichier sans l'extension
                    allPrompts.push({
                        id: promptId,
                        fileName: file.name, // Le nom complet du fichier (ex: "mon-prompt.json")
                        sha: file.sha,       // Le SHA du blob du fichier, nécessaire pour la suppression
                        path: file.path,     // Le chemin complet du fichier dans le dépôt (ex: "prompts/mon-prompt.json")
                        ...promptContent     // Les autres propriétés du prompt (auteur, texte, etc.)
                    });
                } else {
                    const errorDetails = await fileContentRes.text();
                    console.warn(`⚠️ getGalleryPrompts: Impossible de télécharger le contenu de ${file.name}. Statut: ${fileContentRes.status}. Détails: ${errorDetails.substring(0, 100)}`);
                }
            } catch (downloadError) {
                console.error(`❌ getGalleryPrompts: Erreur lors du téléchargement/parsing de ${file.name}: ${downloadError.message}`);
            }
        }

        const filteredPrompts = allPrompts.filter(p => p && typeof p === 'object' && p.auteur && p.imageUrl);

        console.log(`✅ getGalleryPrompts: ${filteredPrompts.length} prompts de galerie récupérés après filtrage.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify(filteredPrompts),
        };

    } catch (error) {
        console.error('❌ getGalleryPrompts: Erreur générale lors de la récupération des prompts de galerie :', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la récupération des prompts: ${error.message}` }),
        };
    }
};
