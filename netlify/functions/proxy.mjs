import fetch from "node-fetch";

export const handler = async (event) => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec";

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);

    if (event.queryStringParameters?.action) {
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
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Script error status:", response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorText }),
      };
    }

    const isJSON = contentType.includes("application/json");
    const data = isJSON ? await response.json() : await response.text();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": isJSON ? "application/json" : "text/plain"
      },
      body: isJSON ? JSON.stringify(data) : data,
    };
  } catch (error) {
    console.error("Proxy function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
