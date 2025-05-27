const fetch = require("node-fetch");

exports.handler = async function (event) {
  console.log("✅ pushPrompt appelée !");

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const prompt = JSON.parse(event.body);
    console.log("📩 Prompt reçu :", prompt);

    const repo = "spiresm/IA_marketing";
    const token = process.env.GITHUB_TOKEN;
    const path = `prompts/prompt-${Date.now()}.json`;

    if (!token) {
      throw new Error("GITHUB_TOKEN manquant");
    }

    const githubUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    const content = Buffer.from(JSON.stringify(prompt, null, 2)).toString("base64");

    const res = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Ajout d’un prompt depuis le formulaire",
        content,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("❌ Erreur GitHub :", data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Erreur API GitHub" }),
      };
    }

    console.log("✅ Prompt sauvegardé :", data.content.download_url);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, url: data.content.download_url }),
    };
  } catch (error) {
    console.error("❌ Erreur dans pushPrompt :", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
