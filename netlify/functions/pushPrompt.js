const fetch = require("node-fetch");

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  try {
    const prompt = JSON.parse(event.body);

    const repo = "spiresm/IA_marketing";
    const token = process.env.GITHUB_TOKEN;
    const path = `prompts/prompt-${Date.now()}.json`;

    if (!token) {
      throw new Error("Token GitHub manquant !");
    }

    const githubUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    const content = Buffer.from(JSON.stringify(prompt, null, 2)).toString("base64");

    const res = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Ajout d’un prompt depuis le site",
        content: content
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Erreur API GitHub" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ success: true, url: data.content.download_url })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
