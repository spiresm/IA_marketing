const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée",
    };
  }

  const data = new URLSearchParams(event.body);
  const nom = data.get("nom");
  const email = data.get("email");
  const type = data.get("type");
  const duree = data.get("duree");
  const date = data.get("date");
  const description = data.get("description");

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
    subject: `Nouvelle demande IA de ${nom}`,
    text: `
Nom: ${nom}
Email: ${email}
Type de production: ${type}
Durée estimée: ${duree}
Date souhaitée: ${date}

Description du besoin :
${description}
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
    };
  } catch (err) {
    console.error("Erreur d’envoi :", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Échec de l'envoi de l'e-mail." }),
    };
  }
};
