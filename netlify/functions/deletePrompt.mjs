import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { promptPath, imagePath } = JSON.parse(event.body);

    const [owner, repo] = ["spiresm", "IA_marketing"];

    console.log("🔍 Suppression demandée pour :");
    console.log("Prompt :", promptPath);
    console.log("Image  :", imagePath);

    // Supprimer le fichier prompt
    if (promptPath) {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: promptPath,
      });

      await octokit.repos.deleteFile({
        owner,
        repo,
        path: promptPath,
        message: `Suppression prompt ${promptPath}`,
        sha: fileData.sha,
      });
      console.log(`✅ Prompt supprimé : ${promptPath}`);
    }

    // Supprimer l'image liée
    if (imagePath) {
      try {
        const { data: imageData } = await octokit.repos.getContent({
          owner,
          repo,
          path: imagePath,
        });

        await octokit.repos.deleteFile({
          owner,
          repo,
          path: imagePath,
          message: `Suppression image ${imagePath}`,
          sha: imageData.sha,
        });
        console.log(`🖼️ Image supprimée : ${imagePath}`);
      } catch (err) {
        const msg = err.response?.data?.message;
        if (msg === "Not Found") {
          console.warn(`⚠️ Image déjà absente : ${imagePath}`);
        } else {
          throw err;
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error("❌ Erreur deletePrompt:", msg);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: msg }),
    };
  }
}
