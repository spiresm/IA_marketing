// Exemple simplifié de ce à quoi la fonction Netlify updatePrompt pourrait ressembler
// (Ceci est un exemple conceptuel, nécessitera des ajustements pour votre structure exacte)

import fetch from 'node-fetch';

export const handler = async (event) => {
    if (event.httpMethod !== 'PUT') { // Utiliser PUT pour les mises à jour
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const token = process.env.GITHUB_TOKEN;
        const repoOwner = "spiresm";
        const repoName = "IA_marketing";
        const promptsFolderPath = "prompts";

        const { id, titre, auteur, outil, chaine, texte, description, imageUrl, sha } = JSON.parse(event.body);

        if (!id || !sha) {
            return { statusCode: 400, body: 'Missing prompt ID or SHA for update.' };
        }

        const fileName = `${id}.json`;
        const filePath = `${promptsFolderPath}/${fileName}`;

        // Construire le nouveau contenu du prompt
        const updatedPromptContent = {
            id, // Assurez-vous que l'ID est bien dans le contenu si vous le sauvegardez
            titre,
            auteur,
            outil,
            chaine,
            texte,
            description,
            imageUrl,
            // Conservez les autres champs si nécessaire, ou ne mettez que ceux qui sont éditables
            // date_creation: (vous pouvez laisser le backend le gérer ou le passer si vous le mettez à jour)
        };

        const contentBase64 = Buffer.from(JSON.stringify(updatedPromptContent, null, 2)).toString('base64');

        const githubUpdateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

        const res = await fetch(githubUpdateUrl, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Netlify-Function-updatePrompt",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Update prompt: ${id}`,
                content: contentBase64,
                sha: sha // C'est crucial pour la mise à jour !
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`GitHub API Error: ${res.status} - ${errorText}`);
            return { statusCode: res.status, body: `Failed to update prompt: ${errorText}` };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "PUT",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ success: true, message: 'Prompt updated successfully!' }),
        };

    } catch (error) {
        console.error('Error updating prompt:', error);
        return { statusCode: 500, body: `Server error: ${error.message}` };
    }
};
