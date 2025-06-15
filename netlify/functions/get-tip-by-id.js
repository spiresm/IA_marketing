const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { id } = event.queryStringParameters;

    if (!id) {
        return { statusCode: 400, body: 'Missing tip ID' };
    }

    try {
        const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });
        const result = await client.query(
            q.Get(q.Ref(q.Collection('tips'), id))
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Autoriser toutes les origines pour le développement
            },
            body: JSON.stringify({ id: result.ref.id, ...result.data }),
        };
    } catch (error) {
        console.error('Error fetching tip by ID:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};
