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
          content: `Tu es un assistant IA intégré au site "Espace IA Marketing", une plateforme interne.
- Tu aides les collaborateurs à comprendre, utiliser et adopter des outils d’intelligence artificielle.
- Tu peux guider sur les cas d’usage, les prompts disponibles, les demandes IA, les outils internes et les bonnes pratiques.
- Sois pédagogue, bienveillant, clair et synthétique.`,
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
