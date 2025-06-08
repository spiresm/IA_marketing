const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body || "{}");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Clé API OpenAI manquante");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Clé API OpenAI manquante dans les variables d’environnement" }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      }),
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("❌ Réponse non JSON :", raw);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Réponse OpenAI invalide (non JSON)", raw }),
      };
    }

    if (!response.ok) {
      console.error("Erreur API OpenAI :", data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || "Erreur inconnue de l'API OpenAI" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: data.choices?.[0]?.message?.content || "Aucune réponse générée",
      }),
    };
  } catch (error) {
    console.error("Erreur dans la fonction serverless :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
