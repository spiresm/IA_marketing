// .netlify/functions/proxy.js

exports.handler = async (event, context) => {
    // ... (vos en-têtes CORS et gestion OPTIONS) ...
    const headers = { /* ... */ };

    console.log('Méthode HTTP entrante:', event.httpMethod);
    console.log('Paramètres de requête entrants (GET):', event.queryStringParameters);
    console.log('Corps de la requête entrant (brut):', event.body);

    let bodyParsed = {};
    if (event.body) {
        try {
            bodyParsed = JSON.parse(event.body);
            console.log('Corps de la requête entrant (parsé):', bodyParsed);
        } catch (e) {
            console.error('Erreur lors de l\'analyse du corps JSON:', e);
            return { statusCode: 400, headers: headers, body: JSON.stringify({ success: false, message: "JSON invalide..." }) };
        }
    }

    const { action, id, ...formData } = bodyParsed;
    console.log('Action extraite:', action);

    try {
        console.log("Tentative de connexion à Google Sheets...");
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth(credentials);
        await doc.loadInfo();
        console.log("Connexion à Google Sheets réussie.");

        console.log("Tentative d'accès à la feuille:", SHEET_TITLE);
        const sheet = doc.sheetsByTitle[SHEET_TITLE];
        console.log("Feuille récupérée:", sheet);

        if (!sheet) {
            console.error(`Feuille avec le titre "${SHEET_TITLE}" non trouvée.`);
            return { statusCode: 500, headers: headers, body: JSON.stringify({ success: false, message: `Feuille "${SHEET_TITLE}" non trouvée.` }) };
        }

        if (event.httpMethod === "GET") {
            if (event.queryStringParameters?.action === "getDemandesIA") {
                console.log("Requête GET pour getDemandesIA.");
                console.log("Avant de récupérer les lignes.");
                const rows = await sheet.getRows();
                console.log("Lignes récupérées:", rows);
                const demands = rows.map(row => ({ /* ... */ }));
                return { statusCode: 200, headers: headers, body: JSON.stringify(demands) };
            }
        } else if (event.httpMethod === "POST") {
            if (action === "sendDemandeIA") {
                console.log("Requête POST pour sendDemandeIA.");
                console.log("Données à ajouter:", formData);
                const newRow = { /* ... */ };
                await sheet.addRow(newRow);
                return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: "Demande ajoutée..." }) };
            } else if (action === "deleteDemandeIA") {
                console.log("Requête POST pour deleteDemandeIA, id:", id);
                const rows = await sheet.getRows();
                const rowToDelete = rows.find(row => row.id === id);
                if (rowToDelete) {
                    await rowToDelete.delete();
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} supprimée.` }) };
                } else {
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée.` }) };
                }
            } else if (action === "markDemandeIAAsTreated") {
                console.log("Requête POST pour markDemandeIAAsTreated, id:", id);
                const rows = await sheet.getRows();
                const rowToUpdate = rows.find(row => row.id === id);
                if (rowToUpdate) {
                    rowToUpdate.traite = 'TRUE';
                    await rowToUpdate.save();
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} marquée comme traitée.` }) };
                } else {
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée.` }) };
                }
            }
        }

        // ... (votre logique de secours) ...

    } catch (error) {
        console.error("Erreur lors de l'interaction avec Google Sheets:", error);
        return { statusCode: 500, headers: headers, body: JSON.stringify({ success: false, message: `Erreur Google Sheets: ${error.message || error}` }) };
    }
};
