import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée' }),
    };
  }

  try {
    const { promptPath, imagePath } = JSON.parse(event.body);
    const [owner, repo] = process.env.GITHUB_REPO.split('/');

    // Fonction pour supprimer un fichier donné
    async function deleteFile(path) {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      await octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message: `Suppression de ${path}`,
        sha: fileData.sha,
      });
    }

    // Supprimer le prompt JSON
    if (promptPath) await deleteFile(promptPath);

    // Supprimer l'image si fournie
    if (imagePath) await deleteFile(imagePath);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('❌ Erreur deletePrompt:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
