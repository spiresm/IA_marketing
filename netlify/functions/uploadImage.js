const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

exports.handler = async (event) => {
  try {
    // 1) Parser le JSON envoyé par le front
    const { fileBase64, fileName } = JSON.parse(event.body);
    console.log('Serveur reçoit', fileName, '— base64 length:', fileBase64.length);

    // 2) Créer ou mettre à jour le fichier sur GitHub
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: `images/${Date.now()}-${fileName}`,
      message: `Ajout de ${fileName}`,
      content: fileBase64,
    });

    // 3) Renvoyer l'URL « raw » pour l'affichage
    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.content.download_url }),
    };

  } catch (error) {
    console.error('uploadImage error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
