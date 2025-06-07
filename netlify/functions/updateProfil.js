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
    const bodyData = JSON.parse(event.body);

    if (!bodyData.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "ID du profil requis" }),
      };
    }

    // 1. Récupère le fichier existant
    const { data: currentFile } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const decodedContent = Buffer.from(currentFile.content, "base64").toString("utf8");
    const json = JSON.parse(decodedContent);

    const profils = json.profils || [];
    const index = profils.findIndex((p) => p.id === bodyData.id);

    if (index === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Profil introuvable" }),
      };
    }

    // 2. Met à jour uniquement les champs fournis (ex : note)
    profils[index] = {
      ...profils[index],
      ...bodyData, // fusionne uniquement les champs fournis (note, etc.)
    };

    const updatedContent = JSON.stringify({ profils }, null, 2);

    // 3. Commit du fichier mis à jour
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Mise à jour du profil ${bodyData.id} (note ou autres champs)`,
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
