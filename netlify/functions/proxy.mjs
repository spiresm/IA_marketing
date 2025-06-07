export const handler = async (event) => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec";

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

    console.log("Proxy envoie vers :", url.toString());
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    const isJSON = contentType.includes("application/json");
    const body = isJSON ? await response.json() : await response.text();

    console.log("Proxy reçoit :", body);

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": isJSON ? "application/json" : "text/plain"
      },
      body: isJSON ? JSON.stringify(body) : body,
    };
  } catch (error) {
    console.error("Erreur proxy.mjs :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur proxy.mjs" }),
    };
  }
};
