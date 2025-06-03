const nodemailer = require("nodemailer");
const multiparty = require("multiparty");

exports.handler = (event, context, callback) => {
  if (event.httpMethod !== "POST") {
    return callback(null, {
      statusCode: 405,
      body: "Méthode non autorisée",
    });
  }

  const form = new multiparty.Form();

  form.parse(
    {
      headers: event.headers,
      // Netlify encode le corps de la requête multipart en base64
      on: () => {},
      pipe: () => {},
      resume: () => {},
      emit: () => {},
      unpipe: () => {},
      readable: true,
      _read: () => {},
      push: () => {},
      read: () => {},
      // Le body doit être un buffer ici
      body: Buffer.from(event.body, "base64"),
    },
    async (err, fields, files) => {
      if (err) {
        console.error("Erreur de parsing:", err);
        return callback(null, {
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
        return callback(null, {
          statusCode: 200,
          body: JSON.stringify({ message: "Demande envoyée avec succès !" }),
        });
      } catch (error) {
        console.error("Erreur d’envoi :", error);
        return callback(null, {
          statusCode: 500,
          body: JSON.stringify({ message: "Échec de l'envoi de l'email." }),
        });
      }
    }
  );
};

// Important pour autoriser le fichier
exports.config = {
  bodyParser: false,
};
