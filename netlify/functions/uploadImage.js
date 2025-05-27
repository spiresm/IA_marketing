const fetch = require("node-fetch");
const sharp = require("sharp");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { name, imageBase64 } = body;

    const buffer = Buffer.from(imageBase64.split(",")[1], "base64");

    // ➜ REDIMENSIONNER et convertir en WebP
    const resizedImage = await sharp(buffer)
      .resize({ width: 1024 })
      .webp({ quality: 80 })
      .toBuffer();

    const content = resizedImage.toString("base64");

    const fileName = `images/${Date.now()}-${name.replace(/\s+/g, "-")}.webp`;

    const res = await fetch(`https://api.github.com/repos/spiresm/IA_marketing/contents/${fileName}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Upload image réduite",
        content: content,
      }),
    });

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, url: data.content.download_url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
