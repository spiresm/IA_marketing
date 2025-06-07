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

    const latestDeploy = deploys[0];

    if (!latestDeploy) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Aucun déploiement trouvé." })
      };
    }

    if (latestDeploy.state === "ready") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "ready",
          id: latestDeploy.id,
          created_at: latestDeploy.created_at,
          url: latestDeploy.deploy_ssl_url
        })
      };
    }

    return {
      statusCode: 202,
      body: JSON.stringify({ status: latestDeploy.state })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur Netlify API",
        details: err.message
      })
    };
  }
};
