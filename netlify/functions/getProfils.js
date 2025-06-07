const { Octokit } = require("@octokit/rest");

exports.handler = async function () {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "spiresm";
  const REPO_NAME = "IA_marketing";
  const FILE_PATH = "netlify/functions/profil.json";
  const BRANCH = "main";

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const decoded = Buffer.from(fileData.content, "base64").toString("utf8");
    const json = JSON.parse(decoded);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Erreur lecture depuis GitHub",
        details: err.message,
      }),
    };
  }
};
