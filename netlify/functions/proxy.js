// .netlify/functions/proxy.js

// Assurez-vous d'avoir importé GoogleSpreadsheet et vos identifiants
// Par exemple:
// const { GoogleSpreadsheet } = require('google-spreadsheet');
// const credentials = require('./credentials.json'); // Ou via variables d'environnement
// const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// const SHEET_TITLE = process.env.SHEET_TITLE;


exports.handler = async (event, context) => {
    // Gestion des en-têtes CORS pour permettre les requêtes depuis votre domaine Netlify
    const headers = {
        'Access-Control-Allow-Origin': '*', // À ajuster si vous avez un domaine spécifique
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // Gérer les requêtes OPTIONS (pré-vol) pour CORS
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
            return { statusCode: 500, headers: headers, body: JSON.stringify({ success: false, message: `Feuille "${SHEET_TITLE}" non trouvée.` }) };
        }
        console.log("Feuille récupérée:", sheet.title);

        if (event.httpMethod === "GET") {
            if (event.queryStringParameters?.action === "getDemandesIA") {
                console.log("Requête GET pour getDemandesIA.");
                const rows = await sheet.getRows();
                console.log(`Lignes récupérées: ${rows.length}`);
                
                // --- PARTIE COMPLÉTÉE : Mappage des données pour l'affichage ---
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
                    traite: row.traite === 'TRUE' // Convertit la chaîne 'TRUE'/'FALSE' en booléen
                }));
                console.log("Demandes formatées pour le client:", demands);
                return { statusCode: 200, headers: headers, body: JSON.stringify(demands) };
            }
        } else if (event.httpMethod === "POST") {
            if (action === "sendDemandeIA") {
                console.log("Requête POST pour sendDemandeIA.");
                console.log("Données à ajouter:", formData);

                // --- PARTIE COMPLÉTÉE : Création de la nouvelle ligne ---
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
                    traite: 'FALSE' // Initialisé comme chaîne 'FALSE'
                };
                await sheet.addRow(newRow);
                console.log("Nouvelle demande ajoutée à la feuille.");
                return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: "Demande ajoutée avec succès!" }) };
            } else if (action === "deleteDemandeIA") {
                console.log("Requête POST pour deleteDemandeIA, id:", id);
                const rows = await sheet.getRows();
                const rowToDelete = rows.find(row => row.id === id); // Recherche par l'ID unique
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
                const rowToUpdate = rows.find(row => row.id === id); // Recherche par l'ID unique
                if (rowToUpdate) {
                    // --- PARTIE COMPLÉTÉE : Marquage comme traité ---
                    rowToUpdate.traite = 'TRUE'; // Met à jour la colonne 'traite'
                    await rowToUpdate.save(); // Sauvegarde les modifications
                    console.log(`Demande ${id} marquée comme traitée.`);
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} marquée comme traitée.` }) };
                } else {
                    console.warn(`Demande ${id} non trouvée pour la mise à jour du statut.`);
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée pour mise à jour.` }) };
                }
            }
        }

        // Si l'action n'est pas reconnue ou la méthode HTTP est incorrecte
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ success: false, message: "Action ou méthode HTTP non supportée." })
        };

    } catch (error) {
        console.error("Erreur générale de la fonction Netlify:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, message: "Erreur interne du serveur.", error: error.message })
        };
    }
};
