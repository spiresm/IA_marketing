// netlify/functions/proxy.js
exports.handler = async (event, context) => {
    try {
        const { handler: actualHandler } = await import('./proxy_logic.mjs'); // <-- Notez bien le './proxy_logic.mjs'
        return await actualHandler(event, context);
    } catch (error) {
        console.error("Erreur dans le wrapper CommonJS de la fonction proxy :", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: `Erreur interne du serveur dans le wrapper proxy : ${error.message}`,
                details: error.stack
            }),
        };
    }
};
