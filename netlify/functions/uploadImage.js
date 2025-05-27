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

    if (!imageBase64 || !fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Image ou nom de fichier manquant" }),
      };
    }

    const repo = "spiresm/IA_marketing";
    const path = `images/${Date.now()}-${fileName}`;
    const token = process.env.GITHUB_TOKEN;

    const githubUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    const content = imageBase64;

    const res = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Ajout d’une image depuis le site`,
        content: content
      })
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        url: data.content?.download_url || null,
        sha: data.content?.sha || null
      })
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
