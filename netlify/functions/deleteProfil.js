const { Octokit } = require("@octokit/rest");

exports.handler = async function (event) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "spiresm";
  const REPO_NAME = "IA_marketing";
  const FILE_PATH = "netlify/functions/profil.json";
  const BRANCH = "main";

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée",
    };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const { id } = JSON.parse(event.body);
    if (!id) throw new Error("ID de profil manquant.");

    // 1. Charger le fichier existant
    const { data: currentFile } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const decodedContent = Buffer.from(currentFile.content, "base64").toString("utf8");
    const json = JSON.parse(decodedContent);
    const profils = json.profils || [];

    // 2. Supprimer le profil
    const updatedProfils = profils.filter((p) => p.id !== id);

    const updatedContent = JSON.stringify({ profils: updatedProfils }, null, 2);

    // 3. Commit avec suppression
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Suppression du profil ${id}`,
      content: Buffer.from(updatedContent).toString("base64"),
      sha: currentFile.sha,
      branch: BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Erreur suppression GitHub:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
