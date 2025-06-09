// prompts.js (ou renommez votre getPrompts.js en prompts.js si c'est votre endpoint)
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler(event) {
  // Optionnel: Gérer les requêtes OPTIONS pour CORS si nécessaire (comme dans deletePrompt)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const owner = process.env.GITHUB_OWNER || "spiresm"; // Utilisez la variable d'env ou votre nom
    const repo = process.env.GITHUB_REPO || "IA_marketing"; // Utilisez la variable d'env ou le nom du repo
    const branch = event.queryStringParameters.ref || 'main'; // Récupérer la branche depuis l'URL ou 'main' par défaut
    const path = 'prompts'; // Le dossier que vous voulez lister

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    // `data` devrait être un tableau si `path` est un dossier
    if (!Array.isArray(data)) {
      console.error(`Le chemin '${path}' n'est pas un dossier ou est vide.`);
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Le chemin '${path}' n'est pas un dossier ou est vide.` }),
      };
    }

    // Retourner uniquement les fichiers (pas les sous-dossiers), avec leur path et sha
    const files = data.map(item => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      type: item.type,
      download_url: item.download_url // URL pour télécharger le contenu du fichier
    })).filter(item => item.type === 'file' && item.name.endsWith('.json')); // Filtrer pour n'inclure que les fichiers .json

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(files),
    };
  } catch (error) {
    console.error('Erreur dans la fonction Netlify prompts:', error);
    let statusCode = 500;
    let errorMessage = "Erreur interne du serveur.";

    if (error.status === 404) {
      statusCode = 404;
      errorMessage = "Dossier 'prompts/' introuvable ou vide sur GitHub.";
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage = `Erreur GitHub API: ${error.response.data.message}`;
    }

    return {
      statusCode: statusCode,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
}
