// sendRequest.js (Netlify Function)
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée",
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

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: "spi@rtbf.be",
      subject: `Nouvelle demande IA de ${data.nom}`,
      text: `
Nom: ${data.nom}
Email: ${data.email}
Type: ${data.type}
Durée: ${data.duree}
Date de livraison: ${data.date}

Description:
${data.description}
${data.image ? "\nUne image est jointe en base64." : ""}
      `,
      attachments: data.image
        ? [
            {
              filename: "reference.jpg",
              content: data.image.split("base64,")[1],
              encoding: "base64",
            },
          ]
        : [],
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
