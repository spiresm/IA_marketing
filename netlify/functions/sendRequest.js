const nodemailer = require("nodemailer");
const multiparty = require("multiparty");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  return new Promise((resolve) => {
    const form = new multiparty.Form();

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("Erreur de parsing :", err);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Erreur de parsing du formulaire." }),
        });
        return;
      }

      // Récupération et sécurisation des champs
      const nom = fields.nom?.[0]?.toString() || "Nom inconnu";
      const email = fields.email?.[0]?.toString() || "Email inconnu";
      const type = fields.type?.[0]?.toString() || "Non spécifié";
      const duree = fields.duree?.[0]?.toString() || "Non précisé";
      const date = fields.date?.[0]?.toString() || "Non indiquée";
      const description = fields.description?.[0]?.toString() || "";
      const refFile = files.reference?.[0] || null;

      const transporter = nodemailer.createTransport({
        service: "gmail", // ou SMTP alternatif
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

Description :
${description}
        `,
        attachments: refFile
          ? [
              {
                filename: refFile.originalFilename,
                path: refFile.path,
              },
            ]
          : [],
      };

      try {
        await transporter.sendMail(mailOptions);
        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
        });
      } catch (error) {
        console.error("Erreur d'envoi email :", error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
        });
      }
    });
  });
};
