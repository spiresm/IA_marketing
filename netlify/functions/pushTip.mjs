// netlify/functions/pushTip.mjs

import { google } from 'googleapis';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { auteur, titre, description, categorie, outilIA, imageUrl, documentUrl } = data;

        // Chargement des credentials depuis une seule variable JSON
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n'));

        // Authentification Google Sheets
        const auth = new google.auth.GoogleAuth({
            credentials,
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
