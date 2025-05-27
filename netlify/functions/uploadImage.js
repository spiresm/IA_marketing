const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];

    if (!contentType || !event.body) {
      return {
        statusCode: 400,
        body: "Requête invalide (fichier ou content-type manquant)."
      };
    }

    const boundaryMatch = contentType.match(/boundary=(.*)$/);
    if (!boundaryMatch) {
      return {
        statusCode: 400,
        body: "Type multipart invalide."
      };
    }

    // ⚠️ En local, Netlify ne parse pas automatiquement les body multipart/form-data.
    // Dans ce cas, l'upload ne fonctionnera qu'avec un backend qui sait lire le binaire.
    const fileBuffer = Buffer.from(event.body, 'base64');
    const fileName = `images/${Date.now()}-uploaded.png`;

    const githubToken = process.env.GITHUB_TOKEN;
    const repo = "spiresm/IA_marketing";

    const url = `https://api.github.com/repos/${repo}/contents/${fileName}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Upload image via formulaire",
        content: fileBuffer.toString('base64')
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        url: data.content.download_url
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `Erreur serveur : ${err.message}`
    };
  }
};
