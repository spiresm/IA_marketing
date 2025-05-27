const fetch = require('node-fetch');

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
    const { imageBase64, fileName } = JSON.parse(event.body);
    const repo = "spiresm/IA_marketing";
    const token = process.env.GITHUB_TOKEN;
    const path = `images/${Date.now()}-${fileName}`;
    const content = imageBase64;

    if (!token) {
      throw new Error("Token GitHub manquant dans Netlify.");
    }

    const githubUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    const res = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Ajout d'image`,
        content: content
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Erreur GitHub" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ url: data.content.download_url })
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
