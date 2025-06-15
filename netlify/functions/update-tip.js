const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { id, ...fieldsToUpdate } = data; // Extrait l'ID et le reste des champs à mettre à jour

        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing tip ID for update.' }) };
        }

        const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

        const updatedTip = await client.query(
            q.Update(
                q.Ref(q.Collection('tips'), id),
                { data: fieldsToUpdate }
            )
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'Tip updated successfully!', tip: { id: updatedTip.ref.id, ...updatedTip.data } }),
        };
    } catch (error) {
        console.error('Error updating tip:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
