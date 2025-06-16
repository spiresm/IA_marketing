// netlify/functions/pushTip.mjs

import { google } from 'googleapis';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { auteur, titre, description, categorie, outilIA, imageUrl, documentUrl } = data;

        // Transformation et LOG de la clé privée pour le débogage
        const transformedPrivateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        // ATTENTION : Cette ligne affichera votre clé privée dans les logs Netlify.
        // NE JAMAIS PARTAGER CES LOGS EN PUBLIC ! Supprimez-la après le débogage.
        console.log('Clé privée transformée pour debug (NE PAS PARTAGER EN PUBLIC):', transformedPrivateKey);

        // Configuration de l'authentification Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: transformedPrivateKey, // Utilise la clé transformée
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheetId = process.env.GOOGLE_SHEET_ID_TIPS;
        const range = 'Tips!A:H';

        const dateSoumission = new Date().toISOString();

        const values = [
            [auteur, titre, description, categorie, outilIA, imageUrl, documentUrl, dateSoumission]
        ];

        const resource = { values };

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip ajouté avec succès!' }),
        };

    } catch (error) {
        console.error('Erreur lors de l\'ajout du tip:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Échec de l\'ajout du tip', details: error.message }),
        };
    }
}

/*
Rappel pour cette fonction :
1.  **Installez googleapis** : Naviguez dans votre dossier `netlify/functions` via votre terminal et exécutez `npm install googleapis`.
    (Ou ajoutez "googleapis": "^VERSION" dans votre package.json et exécutez `npm install` à la racine si vous centralisez les dépendances).
2.  Activer l'API Google Sheets dans Google Cloud Platform.
3.  Créer un compte de service et télécharger son fichier JSON de clés.
4.  Partager la feuille Google Sheet avec l'email du compte de service.
5.  Ajouter les variables d'environnement dans Netlify :
    - GOOGLE_SERVICE_ACCOUNT_EMAIL
    - GOOGLE_PRIVATE_KEY (n'oubliez pas de remplacer les '\n' par de vrais retours à la ligne si vous la copiez-collez en une ligne)
    - GOOGLE_SHEET_ID_TIPS
*/
