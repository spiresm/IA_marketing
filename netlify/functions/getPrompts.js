// getPrompts.js
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function handler() {
  try {
    const { data: file } = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path: 'prompts.json', // <- fichier dans ton repo
    });

    const content = Buffer.from(file.content, 'base64').toString('utf8');
    const prompts = JSON.parse(content);

    return {
      statusCode: 200,
      body: JSON.stringify(prompts),
    };
  } catch (error) {
    console.error('getPrompts error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
