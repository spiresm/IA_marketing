const fetch = require('node-fetch');

exports.handler = async function (event) {
  const prompt = JSON.parse(event.body);

  const repo = "spiresm/IA_marketing";
  const path = `prompts/prompt-${Date.now()}.json`;
  const token = process.env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const content = Buffer.from(JSON.stringify(prompt, null, 2)).toString('base64');

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Ajout d’un prompt depuis le site`,
      content: content
    })
  });

  const data = await res.json();
  return {
    statusCode: res.status,
    body: JSON.stringify(data)
  };
};

