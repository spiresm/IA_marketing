const fetch = require("node-fetch");

exports.handler = async function (event) {
  const { imageBase64, fileName } = JSON.parse(event.body);
  const repo = "TON-UTILISATEUR/TON-REPO"; // ← À remplacer
  const path = `images/${Date.now()}-${fileName}`;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Ajout d'une image via le formulaire Netlify",
      content: imageBase64,
      branch: "main",
    }),
  });

  const result = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify({
      url: result.content?.download_url || null,
      error: result.message || null,
    }),
  };
};
