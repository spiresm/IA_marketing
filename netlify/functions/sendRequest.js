const nodemailer = require("nodemailer");
const multiparty = require("multiparty");
const { Readable } = require("stream");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Méthode non autorisée",
    };
  }

  // Créer une requête compatible multiparty
  const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  const fakeRequest = new Readable();
  fakeRequest.push(buffer);
  fakeRequest.push(null);
  fakeRequest.headers = event.headers;
  fakeRequest.method = event.httpMethod;

  const form = new multiparty.Form();

  return new Promise((resolve) => {
    form.parse(fakeRequest, async (err, fields, files) => {
      if (err) {
        console.error("Erreur de parsing:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Erreur de parsing du formulaire." }),
        });
      }

      const { nom, email, type, duree, date, description } = fields;
      const refFile = files.reference ? files.reference[0] : null;

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

Description du besoin:
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
        console.error("Erreur d’envoi :", error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
        });
      }
    });
  });
};
