// .netlify/functions/proxy.js

exports.handler = async (event, context) => {
    // --- C'est ici que la définition de 'headers' doit être ! ---
    const headers = {
        'Access-Control-Allow-Origin': '*', // À ajuster pour la production
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    // -----------------------------------------------------------

    // Handle OPTIONS preflight requests (ce bloc est bon s'il est au début)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: headers, // Maintenant 'headers' est défini ici
            body: ''
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
            return {
                statusCode: 400,
                headers: headers, // Et ici
                body: JSON.stringify({ success: false, message: "JSON invalide dans le corps de la requête." })
            };
        }
    }

    const { action, id, ...formData } = bodyParsed;
    console.log('Action extraite:', action);

    // --- Le reste de votre logique (Google Sheets, etc.) ---
    try {
        // ... Votre code pour GoogleSpreadsheet (doc, sheet, etc.) ...
        // Assurez-vous que doc et sheet sont bien définis avant d'être utilisés

        if (event.httpMethod === "GET") {
            const queryParams = event.queryStringParameters || {};
            if (queryParams.action === "getDemandesIA") {
                // ... votre logique GET ...
                const rows = await sheet.getRows();
                const demands = rows.map(row => ({
                    id: row.id,
                    // ... autres champs ...
                    traite: row.traite === 'TRUE' || row.traite === 'true'
                }));
                return {
                    statusCode: 200,
                    headers: headers, // Ici aussi
                    body: JSON.stringify(demands)
                };
            }
        } else if (event.httpMethod === "POST") {
            if (action === "sendDemandeIA") {
                // ... votre logique sendDemandeIA ...
                return {
                    statusCode: 200,
                    headers: headers, // Ici aussi
                    body: JSON.stringify({ success: true, message: "Demande ajoutée..." })
                };
            } else if (action === "deleteDemandeIA") {
                // ... votre logique deleteDemandeIA ...
                return {
                    statusCode: 200,
                    headers: headers, // Ici aussi
                    body: JSON.stringify({ success: true, message: `Demande avec l'ID ${id} supprimée.` })
                };
            } else if (action === "markDemandeIAAsTreated") {
                // ... votre logique markDemandeIAAsTreated ...
                return {
                    statusCode: 200,
                    headers: headers, // Ici aussi
                    body: JSON.stringify({ success: true, message: `Demande avec l'ID ${id} marquée comme traitée.` })
                };
            } else {
                console.warn("Requête POST reçue avec une action non reconnue:", action);
                return {
                    statusCode: 400,
                    headers: headers, // Ici aussi
                    body: JSON.stringify({ success: false, message: `Action non reconnue: ${action}` })
                };
            }
        }

        // Cas de secours si aucune condition n'est remplie (ni GET, ni POST avec action reconnue)
        console.warn("Requête non gérée:", event.httpMethod, event.queryStringParameters, bodyParsed);
        return {
            statusCode: 400,
            headers: headers, // Et ici
            body: JSON.stringify({ success: false, message: "Requête non gérée ou action manquante." })
        };

    } catch (error) {
        console.error("Erreur dans la fonction Netlify:", error);
        return {
            statusCode: 500,
            headers: headers, // Ici aussi pour les erreurs
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur: ${error.message}` })
        };
    }
};
