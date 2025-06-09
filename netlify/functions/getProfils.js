// netlify/functions/getProfils.js - Version complète et fonctionnelle

const { Octokit } = require("@octokit/rest");

exports.handler = async function (event, context) {
  // Récupère le token GitHub depuis les variables d'environnement Netlify
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  // Vos informations de dépôt GitHub
  const REPO_OWNER = "spiresm";
  const REPO_NAME = "IA_marketing";
  // Chemin du fichier JSON dans votre dépôt GitHub (relatif à la racine du dépôt)
  const FILE_PATH = "profil.json";
  const BRANCH = "main"; // La branche de votre dépôt

  // Vérification du token GitHub
  if (!GITHUB_TOKEN) {
    console.error("Erreur: GITHUB_TOKEN n'est pas défini dans les variables d'environnement Netlify.");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Configuration serveur manquante (GITHUB_TOKEN)." }),
    };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Tente de récupérer le contenu du fichier profil.json depuis GitHub
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    // Le contenu des fichiers GitHub est encodé en base64, il faut le décoder
    const decoded = Buffer.from(fileData.content, "base64").toString("utf8");
    // Parse le contenu décodé en JSON
    const json = JSON.parse(decoded);

    // Retourne la réponse JSON avec un statut 200 (OK)
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // Permet aux requêtes depuis n'importe quelle origine d'accéder à cette fonction
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(json),
    };
  } catch (err) {
    // Capture et log les erreurs lors de la récupération ou du traitement du fichier
    console.error(`Erreur lors de la lecture du fichier profils depuis GitHub: ${err.message}`);
    // Retourne une erreur avec le statut approprié (404 si GitHub a renvoyé un 404, sinon 500)
    return {
      statusCode: err.status || 500, // Utilise le statut d'erreur de GitHub si disponible
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Erreur lors de la récupération des profils depuis GitHub.",
        details: err.message,
        github_status: err.status, // Inclut le statut HTTP de GitHub si disponible
      }),
    };
  }
};
