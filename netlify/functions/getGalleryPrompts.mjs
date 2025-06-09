import fetch from 'node-fetch'; // Assurez-vous d'avoir node-fetch pour les requêtes HTTP

export const handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, message: 'Méthode non autorisée. Utilisez GET.' }),
        };
    }

    try {
        const token = process.env.GITHUB_TOKEN; // Le même token que pour pushPrompt
        const repo = "spiresm/IA_marketing";
        const promptsFolderPath = "prompts"; // Le dossier où vos prompts sont stockés sur GitHub

        if (!token) {
            console.error("❌ GITHUB_TOKEN manquant pour getGalleryPrompts");
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: "GITHUB_TOKEN manquant. Impossible de récupérer les prompts." }),
            };
        }

        const githubApiUrl = `https://api.github.com/repos/${repo}/contents/${promptsFolderPath}`;

        console.log(`📡 getGalleryPrompts: Tentative de récupération du contenu de ${promptsFolderPath} depuis GitHub.`);

        const res = await fetch(githubApiUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json", // Indiquez que vous voulez l'API v3 JSON
            },
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error(`❌ getGalleryPrompts: Erreur GitHub lors de la liste des fichiers: ${res.status} - ${errorData.message || 'Inconnu'}`);
            return {
                statusCode: res.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false, message: `Erreur GitHub lors de la récupération de la liste des prompts: ${errorData.message}` }),
            };
        }

        const files = await res.json();
        // Filtrer pour ne garder que les fichiers .json
        const jsonFiles = files.filter(file => file.type === 'file' && file.name.endsWith('.json'));

        console.log(`📂 getGalleryPrompts: ${jsonFiles.length} fichiers JSON trouvés dans ${promptsFolderPath}.`);

        const allPrompts = [];

        // Télécharger le contenu de chaque fichier JSON
        for (const file of jsonFiles) {
            try {
                const fileContentRes = await fetch(file.download_url); // Utiliser l'URL de téléchargement directe
                if (fileContentRes.ok) {
                    const promptContent = await fileContentRes.json();
                    allPrompts.push(promptContent);
                } else {
                    console.warn(`⚠️ getGalleryPrompts: Impossible de télécharger le contenu de ${file.name}. Statut: ${fileContentRes.status}`);
                }
            } catch (downloadError) {
                console.error(`❌ getGalleryPrompts: Erreur lors du téléchargement/parsing de ${file.name}: ${downloadError.message}`);
            }
        }

        // Le filtrage (auteur et imageUrl) peut être fait ici ou plus tôt si vous préférez
        const filteredPrompts = allPrompts.filter(p => p.auteur && p.imageUrl);


        console.log(`✅ getGalleryPrompts: ${filteredPrompts.length} prompts de galerie récupérés après filtrage.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // Essentiel pour CORS
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
