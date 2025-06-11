// .netlify/functions/delete-tip.mjs
import { Client, fql } from 'faunadb'; // Importe le client et FQL de FaunaDB

// Initialise le client FaunaDB.
// La clé secrète doit être stockée dans les variables d'environnement de votre site Netlify.
// Allez sur votre tableau de bord Netlify -> Site settings -> Build & deploy -> Environment variables.
// Ajoutez une variable nommée FAUNADB_SECRET_KEY avec votre clé d'accès FaunaDB.
const client = new Client({
    secret: process.env.FAUNADB_SECRET_KEY,
});

export const handler = async (event, context) => {
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body);

    // S'assure que seule la méthode DELETE est acceptée pour cette fonction.
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405, // Code pour "Méthode non autorisée"
            body: JSON.stringify({ message: 'Méthode non autorisée. Seul DELETE est accepté.' }),
        };
    }

    try {
        // Parse le corps de la requête pour extraire l'ID.
        // On s'attend à recevoir un JSON comme ceci: { "id": "votre-id-du-tip" }
        const data = JSON.parse(event.body);
        const { id } = data;

        console.log("ID reçu pour suppression:", id);

        // Vérifie si l'ID est bien présent dans la requête.
        if (!id) {
            console.error("Erreur: L'ID du tip est manquant dans le corps de la requête.");
            return {
                statusCode: 400, // Code pour "Mauvaise requête"
                body: JSON.stringify({ message: 'ID du tip manquant dans la requête.' }),
            };
        }

        // Exécute la commande de suppression dans FaunaDB.
        // Cette ligne suppose que 'tips' est le nom de votre collection dans FaunaDB
        // et que l'ID que vous envoyez est le Ref ID unique du document dans FaunaDB.
        console.log(`Tentative de suppression du tip avec l'ID FaunaDB: ${id}`);
        const result = await client.query(
            fql`tips.byId(${id}).delete()`
            // Si vous n'utilisez pas FQL mais l'ancienne API Query Language (q), ce serait:
            // q.Delete(q.Ref(q.Collection('tips'), id))
        );

        console.log('Suppression réussie ! Résultat de FaunaDB:', result);

        // Retourne une réponse de succès au frontend.
        return {
            statusCode: 200, // Code pour "OK"
            body: JSON.stringify({ message: 'Tip supprimé avec succès!' }),
        };

    } catch (error) {
        // Capture et logue toute erreur survenue pendant l'exécution de la fonction.
        console.error('Erreur lors de la suppression du tip dans la fonction Netlify:', error);
        return {
            statusCode: 500, // Code pour "Erreur interne du serveur"
            body: JSON.stringify({ message: `Erreur interne du serveur lors de la suppression: ${error.message}` }),
        };
    } finally {
        console.log("------------------- Fin de l'exécution de delete-tip.mjs -------------------");
    }
};
