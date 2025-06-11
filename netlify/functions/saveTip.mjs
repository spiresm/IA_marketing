// netlify/functions/saveTip.js

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);

        // NOUVEAU : 'prompt' est maintenant attendu ici !
        // 'outil' a été renommé en 'plateforme' pour correspondre au frontend.
        const { auteur, titre, description, prompt, categorie, plateforme, imageUrl } = data;

        // Validation ajustée pour inclure 'prompt' si vous le rendez obligatoire.
        // Si 'prompt' est optionnel, vous pouvez le retirer de cette condition.
        if (!auteur || !titre || !description || !categorie) { // 'prompt', 'plateforme', 'imageUrl' sont optionnels
            console.error('Missing required tip data during validation:', { auteur, titre, description, prompt, categorie, plateforme, imageUrl });
            return {
                statusCode: 400,
                // Le message d'erreur est maintenant adapté pour l'attente de 'prompt'
                body: JSON.stringify({ message: "Données de tip invalides ou manquantes. Veuillez remplir tous les champs obligatoires (titre, description, catégorie, auteur). Le prompt est optionnel." }),
            };
        }

        // --- Votre logique de sauvegarde des données ici ---
        // Adaptez les noms de colonnes/champs pour votre BDD.
        // Assurez-vous que votre base de données/Google Sheets a une colonne pour 'prompt'.
        console.log("--------------------------------------");
        console.log("Tip reçu et prêt à être sauvegardé:");
        console.log("Auteur:", auteur);
        console.log("Titre:", titre);
        console.log("Description:", description);
        console.log("Prompt:", prompt || "N/A"); // Le champ prompt
        console.log("Catégorie:", categorie);
        console.log("Plateforme/Outil:", plateforme || "N/A");
        console.log("Image URL:", imageUrl || "N/A");
        console.log("Timestamp:", new Date().toISOString());
        console.log("--------------------------------------");

        // Exemple pour Google Sheets (à adapter à votre setup réel) :
        /*
        const { google } = require('googleapis');
        // ... (Votre code d'authentification Google Sheets) ...

        const values = [
            [auteur, titre, description, prompt, categorie, plateforme, imageUrl, new Date().toISOString()]
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: 'YOUR_SPREADSHEET_ID',
            range: 'Tips!A:H', // Ajustez la plage pour inclure la colonne du prompt
            valueInputOption: 'RAW',
            resource: { values },
        });
        */

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip enregistré avec succès!' }),
        };

    } catch (error) {
        console.error('Erreur lors du traitement du tip dans la fonction saveTip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erreur interne du serveur lors de l\'enregistrement du tip.', error: error.message }),
        };
    }
};
