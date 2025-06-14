// .netlify/functions/proxy.js

// --- 1. Importations nécessaires ---
const { GoogleSpreadsheet } = require('google-spreadsheet');

// --- 2. Variables d'environnement (à configurer dans Netlify) ---
// Ces variables DOIVENT être définies dans les "Environment Variables" de votre fonction Netlify.
// Allez dans Netlify > Votre site > Site settings > Build & deploy > Environment.
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_TITLE = process.env.SHEET_TITLE;

// Pour les identifiants du compte de service Google, deux options :
// OPTION A (Recommandée - plus sécurisée) : Stockez le JSON de vos identifiants
// dans une seule variable d'environnement Netlify (ex: GOOGLE_SERVICE_ACCOUNT_KEY).
// Le contenu doit être le JSON brut de votre fichier de clé, échappé si nécessaire.
// Si vous avez utilisé cette méthode :
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// OPTION B (Moins recommandée pour le version control public) : Si vous avez un fichier
// 'credentials.json' dans le même dossier que ce proxy.js (e.g. netlify/functions/credentials.json).
// const credentials = require('./credentials.json');


exports.handler = async (event, context) => {
    // --- 3. Gestion des en-têtes CORS ---
    const headers = {
        'Access-Control-Allow-Origin': '*', // À ajuster si vous avez un domaine spécifique (ex: https://votredomaine.netlify.app)
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
    console.log('Action extraite:', action); // Sera 'undefined' pour les requêtes GET sans corps

    try {
        console.log("Tentative de connexion à Google Sheets...");
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth(credentials);
        await doc.loadInfo(); // Charge les informations de la feuille de calcul
        console.log("Connexion à Google Sheets réussie.");

        console.log("Tentative d'accès à la feuille:", SHEET_TITLE);
        const sheet = doc.sheetsByTitle[SHEET_TITLE];
        if (!sheet) {
            console.error(`Feuille avec le titre "${SHEET_TITLE}" non trouvée.`);
            return { statusCode: 500, headers: headers, body: JSON.stringify({ success: false, message: `Feuille "${SHEET_TITLE}" non trouvée. Vérifiez le titre et les permissions.` }) };
        }
        console.log("Feuille récupérée:", sheet.title);

        // --- 4. Gestion des requêtes GET (pour récupérer les tickets) ---
        if (event.httpMethod === "GET") {
            // L'action est dans queryStringParameters pour les requêtes GET
            if (event.queryStringParameters?.action === "getDemandesIA") {
                console.log("Requête GET pour getDemandesIA.");
                const rows = await sheet.getRows(); // Récupère toutes les lignes de la feuille
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
                    // Convertit la chaîne 'TRUE'/'FALSE' du Google Sheet en booléen pour le client
                    traite: row.traite === 'TRUE'
                }));
                console.log("Demandes formatées pour le client:", demands);
                return { statusCode: 200, headers: headers, body: JSON.stringify(demands) };
            }
        }
        // --- 5. Gestion des requêtes POST (pour ajouter, supprimer, marquer) ---
        else if (event.httpMethod === "POST") {
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
                    traite: 'FALSE' // Initialisé comme chaîne 'FALSE' dans le Google Sheet
                };
                await sheet.addRow(newRow); // Ajoute une nouvelle ligne à la feuille
                console.log("Nouvelle demande ajoutée à la feuille.");
                return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: "Demande ajoutée avec succès!" }) };

            } else if (action === "deleteDemandeIA") {
                console.log("Requête POST pour deleteDemandeIA, id:", id);
                const rows = await sheet.getRows();
                // Trouve la ligne à supprimer en utilisant l'ID
                const rowToDelete = rows.find(row => row.id === id);
                if (rowToDelete) {
                    await rowToDelete.delete(); // Supprime la ligne
                    console.log(`Demande ${id} supprimée de la feuille.`);
                    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, message: `Demande ${id} supprimée.` }) };
                } else {
                    console.warn(`Demande ${id} non trouvée pour la suppression.`);
                    return { statusCode: 404, headers: headers, body: JSON.stringify({ success: false, message: `Demande ${id} non trouvée.` }) };
                }

            } else if (action === "markDemandeIAAsTreated") {
                console.log("Requête POST pour markDemandeIAAsTreated, id:", id);
                const rows = await sheet.getRows();
                // Trouve la ligne à mettre à jour
                const rowToUpdate = rows.find(row => row.id === id);
                if (rowToUpdate) {
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
            body: JSON.stringify({ success: false, message: "Action ou méthode HTTP non supportée ou manquante." })
        };

    } catch (error) {
        console.error("Erreur générale de la fonction Netlify:", error);
        // Des messages d'erreur plus spécifiques pour le débogage :
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
