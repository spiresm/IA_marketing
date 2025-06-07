const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  const SITE_ID = process.env.NETLIFY_SITE_ID;
  const TOKEN = process.env.NETLIFY_API_TOKEN;

  if (!SITE_ID || !TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "SITE_ID ou TOKEN manquant" })
    };
  }

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    const deploys = await res.json();
    const latest = deploys.find(d => d.state === "ready");

    if (latest) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "ready", deployId: latest.id })
      };
    }

    return {
      statusCode: 202,
      body: JSON.stringify({ status: "not_ready" });
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur Netlify API", details: error.message })
    };
  }
};
