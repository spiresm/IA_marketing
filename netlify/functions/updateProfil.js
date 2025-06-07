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
    const profilData = JSON.parse(event.body);

    if (!profilData.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "ID du profil requis" }),
      };
    }

    const { data: currentFile } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const decodedContent = Buffer.from(currentFile.content, "base64").toString("utf8");
    const json = JSON.parse(decodedContent);
    const profils = json.profils || [];

    const index = profils.findIndex((p) => p.id === profilData.id);

    if (index !== -1) {
      profils[index] = { ...profils[index], ...profilData };
    } else {
      profils.push(profilData);
    }

    const updatedContent = JSON.stringify({ profils }, null, 2);

    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Mise à jour ou ajout du profil ${profilData.id}`,
      content: Buffer.from(updatedContent).toString("base64"),
      sha: currentFile.sha,
      branch: BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Erreur GitHub:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
