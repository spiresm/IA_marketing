// Import de node-fetch pour faire la requête HTTP
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);

    // Vérification de la clé API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Clé API OpenAI manquante");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Clé API OpenAI manquante dans les variables d’environnement" })
      };
    }

    // Appel à l'API OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Tu peux changer en "gpt-4" si ton compte y a accès
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    // En cas d'erreur OpenAI
    if (!response.ok) {
      console.error("Erreur API OpenAI :", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || "Erreur inconnue de l'API OpenAI" })
      };
    }

    // Réponse réussie
    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: data.choices[0].message.content
      })
    };

  } catch (error) {
    console.error("Erreur dans la fonction serverless :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
