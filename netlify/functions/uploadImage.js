// netlify/functions/uploadImage.js
const { Octokit } = require("@octokit/rest");

// Instanciez Octokit avec votre token GitHub en variable d’environnement
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

exports.handler = async (event) => {
  try {
    // On suppose que vous parsez déjà le multipart/form-data pour obtenir :
    // - fileBase64 : le contenu du fichier en Base64 (sans préfixe data:…)
    // - fileName   : le nom original du fichier uploadé
    const { fileBase64, fileName } = parseMultipart(event);

    // On crée / met à jour le fichier dans le repo GitHub
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${Date.now()}-${fileName}`,
      message: `Ajout de ${fileName}`,
      content: fileBase64,
    });

    // On renvoie bien download_url pour que <img src="…"> fonctionne
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: data.content.download_url }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * parseMultipart(event)
 * • Si vous utilisez déjà une librairie (busboy, formidable...), conservez votre parser.
 * • L'essentiel : obtenir fileBase64 et fileName.
 */
function parseMultipart(event) {
  // … votre code de parsing existant …
  // Retournez exactement { fileBase64, fileName }
  throw new Error("Implémenter parseMultipart selon votre setup");
}
