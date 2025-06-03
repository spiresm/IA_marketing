import { Octokit } from '@octokit';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler(event) {
  try {
    const { fileBase64, fileName } = JSON.parse(event.body);

    const path = `images/${Date.now()}-${fileName}`;

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: path,
      message: `Ajout de ${fileName}`,
      content: fileBase64,
    });

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
}
