const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const NETLIFY_SITE_ID = "votre_site_id"; // remplace par ton ID Netlify
  const NETLIFY_TOKEN = process.env.NETLIFY_API_TOKEN; // stocke ce token dans les variables d'environnement Netlify

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys`, {
      headers: {
        Authorization: `Bearer ${NETLIFY_TOKEN}`
      }
    });

    const deploys = await res.json();
    const latestDeploy = deploys.find(dep => dep.state === 'ready');

    if (!latestDeploy) {
      return {
        statusCode: 503,
        body: JSON.stringify({ status: "en_cours" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "prêt",
        deploy: {
          id: latestDeploy.id,
          created_at: latestDeploy.created_at,
          url: latestDeploy.deploy_ssl_url
        }
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lors de la récupération du déploiement", details: err.message })
    };
  }
};
