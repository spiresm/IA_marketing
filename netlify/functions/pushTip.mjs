// netlify/functions/pushTip.js
const { google } = require('googleapis');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { auteur, titre, description, categorie, outilIA, imageUrl, documentUrl } = data;

        // Configuration de l'authentification Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                // Assurez-vous que la clé privée est bien formatée avec les vrais retours à la ligne
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // REMPLACEZ 'YOUR_SPREADSHEET_ID' par l'ID de votre feuille Google Sheet
        // Et 'Tips!A:H' par la plage où vous voulez insérer vos données
        const spreadsheetId = process.env.GOOGLE_SHEET_ID_TIPS; // Il est recommandé d'utiliser une variable d'environnement
        const range = 'Tips!A:H'; // Assurez-vous que le nom de votre feuille est correct (ex: 'Tips')

        const dateSoumission = new Date().toISOString(); // Ajout de la date et heure de soumission

        // Les valeurs à ajouter dans les colonnes de votre feuille Google Sheet
        const values = [
            [auteur, titre, description, categorie, outilIA, imageUrl, documentUrl, dateSoumission]
        ];

        const resource = { values };

        // Ajout des données à la feuille Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW', // Les valeurs seront insérées telles quelles
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
};

/*
Pour que cette fonction marche :
1.  Activer l'API Google Sheets dans Google Cloud Platform.
2.  Créer un compte de service et télécharger son fichier JSON de clés.
3.  Partager la feuille Google Sheet avec l'email du compte de service.
4.  Ajouter les variables d'environnement dans Netlify :
    - GOOGLE_SERVICE_ACCOUNT_EMAIL (l'email du compte de service)
    - GOOGLE_PRIVATE_KEY (la clé privée du fichier JSON, n'oubliez pas de remplacer les '\n' par de vrais retours à la ligne si vous la copiez-collez en une ligne)
    - GOOGLE_SHEET_ID_TIPS (l'ID de votre feuille Google Sheet spécifique aux tips)
*/
