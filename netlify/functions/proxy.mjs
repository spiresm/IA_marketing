// ... (début de proxy.mjs)

export const handler = async (event) => {
    // ... (votre code existant)

    if (event.httpMethod === 'POST' && event.body) { // Utiliser event.body directement
        try {
            const parsedBody = JSON.parse(event.body);
            if (parsedBody && parsedBody.action) {
                action = parsedBody.action; // L'action est dans le corps JSON
            }
            // Conserver le corps parsé pour un traitement ultérieur si nécessaire,
            // ou le remodeler ici pour certains cas.
            // Pour updateDemandeIA et deleteDemande, on aura besoin de le remodeler.
            event.parsedBody = parsedBody; // Stocker le corps parsé pour un accès facile
            // Gardons requestBody comme string original pour l'envoi général, on le modélisera au cas par cas.

        } catch (parseError) {
            console.warn("Proxy.mjs: Corps de requête POST non valide ou non JSON :", parseError);
        }
    }
    
    // ... (reste du code)

    switch (action) {
        // ... (vos autres cas)

        case 'updateDemandeIA': // Cas pour marquer traité
            targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
            fetchMethod = 'POST';
            // Remodeler le corps pour correspondre à ce que GAS attend pour updateDemandeIA
            if (event.parsedBody && event.parsedBody.id) {
                requestBody = JSON.stringify({
                    action: action, // L'action est déjà là
                    demandes: [{ // GAS attend un tableau de demandes
                        id: event.parsedBody.id,
                        traite: event.parsedBody.traite // Doit être true
                    }]
                });
            } else {
                console.error("Proxy.mjs: ID ou statut manquant pour updateDemandeIA.");
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: "ID ou statut de demande manquant pour la mise à jour." }),
                };
            }
            break;
        
        case 'deleteDemande': // Cas pour la suppression
            targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
            fetchMethod = 'POST';
            // Supposons que deleteDemande attend aussi 'demandes' avec l'id
            if (event.parsedBody && event.parsedBody.id) {
                 requestBody = JSON.stringify({
                    action: action,
                    demandes: [{ id: event.parsedBody.id }] // Envoyer l'ID dans un tableau pour delete
                });
            } else {
                console.error("Proxy.mjs: ID manquant pour deleteDemande.");
                 return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, message: "ID de demande manquant pour la suppression." }),
                };
            }
            break;

        // ... (reste des cas et fin du fichier)
    }
    // ... (le fetch final)
};
