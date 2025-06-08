const fetch = require("node-fetch");

exports.handler = async function (event) {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec";

  const method = event.httpMethod;
  let url = GAS_URL;

  if (method === "GET" && event.queryStringParameters) {
    const query = new URLSearchParams(event.queryStringParameters).toString();
    url += "?" + query;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: method === "POST" ? event.body : undefined,
    });

    const text = await response.text();
    return {
      statusCode: 200,
      body: text,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur proxy: " + error.message }),
    };
  }
};
