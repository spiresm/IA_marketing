const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async (event, context) => {
    // Gère les requêtes OPTIONS (preflight) pour CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: {
                'Access-Control-Allow-Origin': '*', // Autorise toutes les origines (à ajuster pour la production)
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS', // Autorise PUT, POST et OPTIONS
                'Access-Control-Allow-Headers': 'Content-Type', // Autorise l'en-tête Content-Type
            },
            body: '' // Corps vide pour les requêtes OPTIONS
        };
    }

    // Vérifie si la méthode HTTP est PUT. Si ce n'est pas le cas, retourne une erreur 405.
    if (event.httpMethod !== 'PUT') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
            headers: {
                'Allow': 'PUT, POST, OPTIONS', // Indique les méthodes autorisées
                'Access-Control-Allow-Origin': '*',
            }
        };
    }

    try {
        const data = JSON.parse(event.body);
        // Pour une mise à jour FaunaDB, vous avez besoin de l'ID du document.
        // Le SHA était pertinent pour la mise à jour directe d'un fichier sur GitHub,
        // mais pas directement pour FaunaDB.
        const { id, ...fieldsToUpdate } = data; // Extrait l'ID et le reste des champs

        if (!id) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing tip ID for update.' })
            };
        }

        const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

        const updatedTip = await client.query(
            q.Update(
                q.Ref(q.Collection('tips'), id), // Référence au document par son ID dans la collection 'tips'
                { data: fieldsToUpdate } // Les données à mettre à jour
            )
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: 'Tip updated successfully!', tip: { id: updatedTip.ref.id, ...updatedTip.data } }),
        };
    } catch (error) {
        console.error('Error updating tip:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
