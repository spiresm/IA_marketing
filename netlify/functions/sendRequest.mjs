import nodemailer from "nodemailer";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Corps de requête invalide (JSON attendu)" }),
    };
  }

  const { nom, email, type, duree, date, description } = data;

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
    subject: `Nouvelle demande IA de ${nom || "Anonyme"}`,
    text: `
Nom : ${nom}
Email : ${email}
Type de production : ${type}
Durée estimée : ${duree}
Date souhaitée : ${date}

Description du besoin :
${description}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
    };
  } catch (error) {
    console.error("Erreur SMTP :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
    };
  }
};
