import { google } from 'googleapis';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { auteur, titre, description, categorie, outilIA, imageUrl, documentUrl } = data;

        // Préparation des credentials à partir de deux variables d’environnement
        const credentials = {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheetId = process.env.GOOGLE_SHEET_ID_TIPS;
        const range = 'Tips!A:H';
        const dateSoumission = new Date().toISOString();

        const values = [
            [auteur, titre, description, categorie, outilIA, imageUrl, documentUrl, dateSoumission],
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip ajouté avec succès!' }),
        };
    } catch (error) {
        console.error("Erreur lors de l'ajout du tip:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Échec de l'ajout du tip",
                details: error.message,
            }),
        };
    }
}
