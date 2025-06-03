const nodemailer = require("nodemailer");
const multiparty = require("multiparty");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée",
    };
  }

  const form = new multiparty.Form();

  return new Promise((resolve) => {
    form.parse(event, async (err, fields, files) => {
      if (err) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Erreur de parsing du formulaire." }),
        });
        return;
      }

      const { nom, email, type, duree, date, description } = fields;
      const refFile = files.reference ? files.reference[0] : null;

      const transporter = nodemailer.createTransport({
        service: "gmail", // ou utilisez un SMTP professionnel
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

Description du besoin:
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
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
        });
      }
    });
  });
};
