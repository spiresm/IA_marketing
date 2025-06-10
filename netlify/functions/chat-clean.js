const { OpenAI } = require("openai");

const openai = new OpenAI();

exports.handler = async function(event) {
  const { message } = JSON.parse(event.body || "{}");

  if (!message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Message manquant" }),
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant dédié au site interne "Espace IA Marketing". 
Ce site présente des cas d’usage d’IA, des outils, des prompts, et sert de centre de ressources pour les équipes internes.
Ta mission est de guider les utilisateurs, répondre aux questions sur les usages de l’IA dans le marketing, et aider à trouver des contenus du site.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: completion.choices[0].message.content }),
    };
  } catch (err) {
    console.error("Erreur OpenAI:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur serveur ou API OpenAI" }),
    };
  }
};
