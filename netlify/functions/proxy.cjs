// netlify/functions/proxy.cjs

// --- 1. Importations nécessaires (syntaxe CommonJS) ---
const { GoogleSpreadsheet } = require('google-spreadsheet');

// --- 2. Variables d'environnement (à configurer dans Netlify) ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_TITLE = process.env.SHEET_TITLE;
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Utilisez exports.handler pour la fonction handler (syntaxe CommonJS)
exports.handler = async (event, context) => {
    // --- 3. Gestion des en-têtes CORS ---
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: 'OK'
        };
    }

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
            return { statusCode: 400, headers: headers, body: JSON.stringify({ success: false, message: "JSON invalide." }) };
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
        if (!sheet) {
            console.error(`Feuille avec le titre "${SHEET_TITLE}" non trouvée.`);
            return { statusCode: 500, headers: headers, body: JSON.stringify({ success: false, message: `Feuille "${SHEET_TITLE}" non trouvée. Vérifiez le titre et les permissions.` }) };
        }
        console.log("Feuille récupérée:", sheet.title);

        if (event.httpMethod === "GET") {
            if (event.queryStringParameters?.action === "getDemandesIA") {
                console.log("Requête GET pour getDemandesIA.");
                const rows = await sheet.getRows();
                console.log(`Lignes récupérées: ${rows.length}`);

                const demands = rows.map(row => ({
                    id: row.id,
                    nom: row.nom,
                    email: row.email,
                    type: row.type,
                    support: row.support,
                    chaine: row.chaine,
                    duree: row.duree,
                    date: row.date,
                    description: row.description,
                    traite: row.traite === 'TRUE'
                }));
                console.log("Demandes formatées pour le client:", demands);
                return { statusCode: 200, headers: headers, body: JSON.stringify(demands) };
            }
        } else if (event.httpMethod === "POST") {
            if (action === "sendDemandeIA") {
                console.log("Requête POST pour sendDemandeIA.");
                console.log("Données à ajouter:", formData);

                const newRow = {
                    id: formData.id,
                    nom: formData.nom,
                    email: formData.email,
                    type: formData.type,
                    support: formData.support,
                    chaine: formData.chaine,
                    duree: formData.duree,
                    date: formData.date,
                    description: formData.description,
                    traite: 'FALSE'
                };
                await sheet.addRow(newRow);
                console.log("Nouvelle demande ajoutée à la feuille.");
                return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: "Demande ajoutée avec succès!" }) };

            } else if (action === "deleteDemandeIA") {
                console.log("Requête POST pour deleteDemandeIA, id:", id);
                const rows = await sheet.getRows();
                const rowToDelete = rows.find(row => row.id === id);
                if (rowToDelete) {
                    await rowToDelete.delete();
                    console.log(`Demande ${id} supprimée de la feuille.`);
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} supprimée.` }) };
                } else {
                    console.warn(`Demande ${id} non trouvée pour la suppression.`);
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée.` }) };
                }

            } else if (action === "markDemandeIAAsTreated") {
                console.log("Requête POST pour markDemandeIAAsTreated, id:", id);
                const rows = await sheet.getRows();
                const rowToUpdate = rows.find(row => row.id === id);
                if (rowToUpdate) {
                    rowToUpdate.traite = 'TRUE';
                    await rowToUpdate.save();
                    console.log(`Demande ${id} marquée comme traitée.`);
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} marquée comme traitée.` }) };
                } else {
                    console.warn(`Demande ${id} non trouvée pour la mise à jour du statut.`);
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée pour mise à jour.` }) };
                }
            }
        }

        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ success: false, message: "Action ou méthode HTTP non supportée ou manquante." })
        };

    } catch (error) {
        console.error("Erreur générale de la fonction Netlify:", error);
        if (error.message.includes("GoogleSpreadsheet is not defined")) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, message: "Erreur de configuration: la librairie 'google-spreadsheet' n'est pas importée ou installée. Vérifiez vos dépendances et votre code." })
            };
        } else if (error.message.includes("SHEET_TITLE")) {
             return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, message: "Erreur de configuration: le titre de la feuille (SHEET_TITLE) est incorrect ou non défini." })
            };
        } else if (error.message.includes("credentials")) {
             return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, message: "Erreur de configuration: les identifiants Google (credentials) sont manquants ou invalides." })
            };
        } else {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, message: "Erreur interne du serveur lors de l'accès à Google Sheets.", error: error.message })
            };
        }
    }
};
