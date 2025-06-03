const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  let data;
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Requête vide." }),
      };
    }

    data = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "JSON invalide." }),
    };
  }

  const escape = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0077b6;">Nouvelle demande de production IA</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr><td style="padding: 8px; font-weight: bold;">👤 Nom :</td><td style="padding: 8px;">${escape(data.nom)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📧 Email :</td><td style="padding: 8px;">${escape(data.email)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">🎬 Type :</td><td style="padding: 8px;">${escape(data.type)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">🛰 Support :</td><td style="padding: 8px;">${escape(data.support)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">⏱ Durée :</td><td style="padding: 8px;">${escape(data.duree)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📅 Livraison :</td><td style="padding: 8px;">${escape(data.date)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📝 Description :</td><td style="padding: 8px; white-space: pre-line;">${escape(data.description)}</td></tr>
          </table>
          <br>
          ${
            data.images && data.images.length
              ? `<h3 style="color: #0077b6;">📎 ${data.images.length} image(s) jointe(s)</h3>`
              : `<p><i>Aucune image de référence fournie.</i></p>`
          }
        </body>
      </html>
    `;

    const attachments = Array.isArray(data.images)
      ? data.images.map((img, i) => ({
          filename: `image-${i + 1}.jpg`,
          content: img.split("base64,")[1],
          encoding: "base64",
        }))
      : [];

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: "spi@rtbf.be",
      subject: `Nouvelle demande IA de ${data.nom}`,
      html: htmlContent,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
    };
  } catch (error) {
    console.error("Erreur d’envoi :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
    };
  }
};
