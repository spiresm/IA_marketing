// netlify/functions/updateDemandesIA.mjs

exports.handler = async (event) => {
    const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec"; // <--- C'EST CETTE URL QUI DOIT ÊTRE UTILISÉE POUR TOUTES LES REQUÊTES VERS GOOGLE APPS SCRIPT

    if (event.httpMethod === "GET") {
        // Logique pour les requêtes GET
        // Le log montre que cette partie fonctionne, et elle utilise la bonne URL avec ?action=getDemandesIA
        try {
            const response = await fetch(`${googleAppsScriptUrl}?action=getDemandesIA`, {
                method: "GET",
                headers: {}, // Pas besoin de Content-Type pour GET
            });
            const data = await response.json();
            return { statusCode: 200, body: JSON.stringify(data) };
        } catch (error) {
            console.error("Erreur GET vers Google Apps Script:", error);
            return { statusCode: 500, body: JSON.stringify({ error: "Erreur GET: " + error.message }) };
        }

    } else if (event.httpMethod === "POST") {
        // Logique pour les requêtes POST
        let clientPayload;
        try {
            clientPayload = JSON.parse(event.body);
        } catch (error) {
            return { statusCode: 400, body: JSON.stringify({ error: "Format JSON invalide." }) };
        }

        console.log("Reçu de l'interface utilisateur (depuis Netlify):", clientPayload);

        try {
            // *** ASSUREZ-VOUS QUE CET APPEL UTILISE googleAppsScriptUrl ET NON L'URL NETLIFY ***
            const response = await fetch(googleAppsScriptUrl, { // <--- CECI EST TRÈS IMPORTANT
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(clientPayload),
            });

            const data = await response.json();
            console.log("Réponse de Google Apps Script (reçue par Netlify):", data);

            if (data.success) {
                return { statusCode: 200, body: JSON.stringify(data) };
            } else {
                return { statusCode: 500, body: JSON.stringify(data) };
            }
        } catch (error) {
            console.error("Erreur POST vers Google Apps Script (depuis Netlify):", error);
            return { statusCode: 500, body: JSON.stringify({ error: "Erreur serveur lors de la communication avec Google Apps Script: " + error.message }) };
        }
    } else {
        return { statusCode: 405, body: "Méthode non autorisée. Seuls GET et POST sont supportés." };
    }
};
