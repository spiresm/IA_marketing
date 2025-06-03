const nodemailer = require("nodemailer");

exports.handler = async function (event, context) {
  try {
    const data = JSON.parse(event.body);

    const html = generateEmailHTML(data);

    // Configure ton SMTP ici (ex : Gmail, Mailjet, etc.)
    const transporter = nodemailer.createTransport({
      host: "smtp.example.com", // exemple : smtp.gmail.com
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Espace IA" <${process.env.SMTP_USER}>`,
      to: "steeve@rtbf.be", // ou une liste
      subject: "Nouvelle demande IA",
      html: html,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Votre demande a bien été envoyée." }),
    };
  } catch (error) {
    console.error("Erreur:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erreur lors de l'envoi de la demande." }),
    };
  }
};

// Fonction de génération du HTML
function generateEmailHTML(data) {
  const {
    nom,
    email,
    type,
    support,
    duree,
    date,
    description,
    image,
  } = data;

  return `
<!DOCTYPE html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #0077b6;">Nouvelle demande de production IA</h2>
    
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <td style="padding: 8px; font-weight: bold;">👤 Nom :</td>
        <td style="padding: 8px;">${nom}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">📧 Email :</td>
        <td style="padding: 8px;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">🎬 Type de production :</td>
        <td style="padding: 8px;">${type}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">🛰 Support :</td>
        <td style="padding: 8px;">${support}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">⏱ Durée :</td>
        <td style="padding: 8px;">${duree}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">📅 Date de livraison :</td>
        <td style="padding: 8px;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">📝 Description :</td>
        <td style="padding: 8px;">${description}</td>
      </tr>
    </table>

    <br>
    <h3 style="color: #0077b6;">📎 Image de référence</h3>
    ${
      image
        ? `<p>Une image est jointe ci-dessous :</p>
           <img src="${image}" alt="Image de référence" style="max-width: 100%; border: 1px solid #ccc; padding: 4px; border-radius: 4px;">`
        : `<p><i>Aucune image de référence fournie.</i></p>`
    }
  </body>
</html>`;
}
