const nodemailer = require("nodemailer");
const fetch = require("node-fetch"); // <-- NOUVEAU: Ajoutez cette ligne

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Méthode non autorisée" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // --- PARTIE 1: ENVOI DE L'EMAIL (VIA NODEMAILER) ---
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
            <tr><td style="padding: 8px; font-weight: bold;">🛰 Support :</td><td style="padding: 8px;">${data.support || 'Non spécifié'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">⏱ Durée :</td><td style="padding: 8px;">${data.duree}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📅 Livraison :</td><td style="padding: 8px;">${data.date}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📚 Chaîne :</td><td style="padding: 8px;">${data.chaine || 'Non spécifié'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">📝 Description :</td><td style="padding: 8px;">${data.description}</td></tr>
          </table>
          <br>
          ${
            data.images && data.images.length > 0
              ? `<p><strong>📎 ${data.images.length} image(s) jointe(s)</strong></p>`
              : `<p><i>Aucune image jointe.</i></p>`
          }
        </body>
      </html>
    `;

    const attachments = (data.images || []).map((img, i) => ({
      filename: `image_${i + 1}.jpg`,
      content: img.split("base64,")[1],
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
    console.log("Mail envoyé avec succès via Netlify Function."); // Log pour Netlify

    // --- NOUVELLE PARTIE: ENVOI À GOOGLE APPS SCRIPT (POUR LA FEUILLE DE CALCUL) ---
    // REMPLACEZ 'URL_DE_VOTRE_APPLICATION_WEB_GOOGLE_APPS_SCRIPT_ICI'
    // par l'URL exacte que vous avez obtenue après le déploiement de votre GAS.
    const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbzbeDuX3Sw31cQRTkR4Ff03UsQMOLyYXwYCxYejQwdcOGE_ltHyaWHMwjbSxhR5phpy/exec"; 
    
    // Assurez-vous que 'data' contient tous les champs que Google Apps Script attend pour l'insertion
    const dataForGas = {
        action: "updateDemandeIA", // C'est l'action qui doit être passée à doPost dans votre GAS
        demande: {
            id: data.id || Date.now().toString(), // Générez un ID si absent pour l'insertion/update dans la feuille
            nom: data.nom,
            email: data.email,
            type: data.type,
            support: data.support,
            duree: data.duree,
            date: data.date,
            chaine: data.chaine,
            description: data.description,
            traite: false // Nouvelle demande non traitée par défaut
        }
    };

    const gasResponse = await fetch(googleAppsScriptUrl, {
        method: "POST", // Ceci doit être POST pour déclencher doPost dans GAS
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(dataForGas), // Le corps de la requête en JSON
    });

    const gasResult = await gasResponse.json();
    console.log("Réponse de Google Apps Script :", gasResult); // Log pour Netlify

    if (!gasResult.success) {
        console.error("Erreur de Google Apps Script lors de la mise à jour de la feuille :", gasResult.message);
        // Vous pouvez choisir de retourner une erreur ici ou de laisser le mail passer même si la feuille échoue
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Demande envoyée (mail OK), mais erreur à la feuille Google. " + gasResult.message }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Demande envoyée avec succès (mail et feuille) !" }),
    };
  } catch (error) {
    console.error("Erreur d’envoi générale dans Netlify Function :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erreur serveur", error: error.message }),
    };
  }
};
