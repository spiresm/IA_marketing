const fetch = require("node-fetch");

exports.handler = async (event) => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec";

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);

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

    console.log("Fetching URL:", url.toString());
    console.log("Fetch options:", fetchOptions);

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Script error status:", response.status, errorText);
      return {
        statusCode: response.status,
        body: errorText,
      };
    }

    const data = await response.text();
    console.log("Response data:", data);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: data,
    };
  } catch (error) {
    console.error("Proxy function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
