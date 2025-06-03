const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

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
            <tr><td style="padding: 8px; font-weight: bold;">👤 Nom :</td><td style="padding: 8px;">${data.nom}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📧 Email :</td><td style="padding: 8px;">${data.email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">🎬 Type :</td><td style="padding: 8px;">${data.type}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">🛰 Support :</td><td style="padding: 8px;">${data.support}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">⏱ Durée :</td><td style="padding: 8px;">${data.duree}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📅 Livraison :</td><td style="padding: 8px;">${data.date}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📝 Description :</td><td style="padding: 8px;">${data.description}</td></tr>
          </table>
          <br>
          ${
            data.images && data.images.length
              ? `<h3 style="color: #0077b6;">📎 ${data.images.length} image(s) de référence jointe(s)</h3>`
              : `<p><i>Aucune image de référence fournie.</i></p>`
          }
        </body>
      </html>
    `;

    const attachments = (data.images || []).map((base64, i) => ({
      filename: `reference_${i + 1}.jpg`,
      content: base64.split("base64,")[1],
      encoding: "base64",
    }));

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
      body: JSON.stringify({ message: "Erreur serveur : envoi échoué." }),
    };
  }
};
