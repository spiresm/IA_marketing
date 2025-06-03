import nodemailer from "nodemailer";
import multiparty from "multiparty";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  const form = new multiparty.Form();

  return new Promise((resolve) => {
    form.parse(event, async (err, fields, files) => {
      if (err) {
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Erreur de parsing du formulaire." }),
        });
      }

      const nom = fields.nom?.[0] || "Nom inconnu";
      const email = fields.email?.[0] || "Email inconnu";
      const type = fields.type?.[0] || "Type non spécifié";
      const duree = fields.duree?.[0] || "Non précisé";
      const date = fields.date?.[0] || "Non précisé";
      const description = fields.description?.[0] || "";
      const refFile = files.reference?.[0];

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
Nom : ${nom}
Email : ${email}
Type de production : ${type}
Durée estimée : ${duree}
Date souhaitée : ${date}

Description du besoin :
${description}
        `,
        attachments: refFile
          ? [{
              filename: refFile.originalFilename,
              path: refFile.path,
            }]
          : [],
      };

      try {
        await transporter.sendMail(mailOptions);
        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
        });
      } catch (error) {
        console.error("Erreur SMTP :", error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
        });
      }
    });
  });
};
