// netlify/functions/getprofils.js

const { Octokit } = require("@octokit/rest");

exports.handler = async function (event, context) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Doit être défini dans Netlify
  const REPO_OWNER = "spiresm";
  const REPO_NAME = "IA_marketing";
  const FILE_PATH = "profil.json"; // Le chemin est relatif à la racine du DÉPÔT GitHub
  const BRANCH = "main";

  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN n'est pas défini dans les variables d'environnement Netlify.");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Configuration serveur manquante (GITHUB_TOKEN)." }),
    };
  }

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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error("Erreur lors de la lecture du fichier profils depuis GitHub:", err.message);
    return {
      statusCode: err.status || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Erreur lors de la récupération des profils depuis GitHub.",
        details: err.message,
        github_status: err.status,
      }),
    };
  }
};
