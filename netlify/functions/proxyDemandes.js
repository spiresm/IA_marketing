const fetch = require("node-fetch");

exports.handler = async (event) => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec";

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);

    // Si l'appel contient un paramètre "action" (ex: ?action=getDemandesIA), on le passe au script
    if (event.queryStringParameters && event.queryStringParameters.action) {
      url.searchParams.append("action", event.queryStringParameters.action);
    }

    const fetchOptions = {
      method: event.httpMethod,
      headers: {},
    };

    if (event.httpMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = event.body;
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",  // Autoriser toutes les origines (ton frontend)
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
