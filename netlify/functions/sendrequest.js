// Votre fonction Netlify sendrequest.js
const fetch = require('node-fetch'); // Assurez-vous d'avoir node-fetch si vous êtes sur un environnement Node.js

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Méthode non autorisée' };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        console.error('Erreur de parsing JSON dans la requête Netlify :', error);
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Requête invalide : corps JSON mal formé.' }) };
    }

    const { id, nom, email, type, support, duree, date, description, chaine } = data;

    // --- ENVOI DE L'EMAIL ---
    try {
        const mailOptions = {
            // Remplacer par votre service d'email si vous utilisez une API comme SendGrid, Mailgun, etc.
            // Pour un simple envoi via une bibliothèque comme Nodemailer (si supporté par Netlify/votre config),
            // ou via un service tiers comme Mailgun/SendGrid.
            // Si vous utilisez une autre fonction Netlify pour l'envoi d'e-mail, appelez-la ici.
            // Par exemple, si vous avez une fonction Netlify `send-email.js`
            // const emailResponse = await fetch('/.netlify/functions/send-email', { /* ... */ });

            // Pour l'instant, si vous gérez l'envoi d'email directement ici sans service tiers visible,
            // ou si c'est simplement un placeholder :
            subject: `Nouvelle demande IA : ${type} de ${nom}`,
            body: `
Nom : ${nom}
Email : ${email}
Type : ${type}
Support : ${support}
Durée : ${duree}
Date : ${date}
Chaîne : ${chaine}
Description : ${description}
            `,
            to: "spi@rtbf.be" // L'adresse email de destination
        };
        console.log("Tentative d'envoi d'email...");
        // Ici, vous intégreriez votre logique d'envoi d'e-mail réelle (ex: SendGrid, Nodemailer, etc.)
        // Pour cet exemple, nous allons simuler un succès
        const emailSent = true; // Simuler le succès de l'envoi d'e-mail
        if (!emailSent) { // Si l'envoi d'e-mail échoue pour une raison quelconque
             return {
                statusCode: 500,
                body: JSON.stringify({ success: false, message: "Erreur lors de l'envoi de l'e-mail." }),
            };
        }
        console.log("Email envoyé avec succès.");

    } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'e-mail :', emailError);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `Erreur lors de l'envoi de l'e-mail: ${emailError.message}` }),
        };
    }

    // --- MISE À JOUR DE LA FEUILLE GOOGLE VIA GOOGLE APPS SCRIPT ---
    const googleAppsScriptUrl = "https://script.google.com/macros/s/AKfycbzbeDuX3Sw31cQRTkR4Ff03UsQMOLyYXwYCxYejQwdcOGE_ltHyaWHMwjbSxhR5phpy/exec"; // Votre URL de GAS
    const dataForGas = {
        action: "updateDemandeIA",
        demandes: [{ id, nom, email, type, support, duree, date, description, chaine, traite: false }]
    };

    try {
        const gasResponse = await fetch(googleAppsScriptUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dataForGas),
        });

        let gasResult;
        // Vérifier si la réponse de GAS est OK avant de tenter de la parser en JSON
        if (!gasResponse.ok) {
            const errorText = await gasResponse.text();
            console.error('Erreur HTTP de Google Apps Script :', gasResponse.status, errorText);
            return {
                statusCode: 500,
                body: JSON.stringify({ success: false, message: `Erreur de la feuille Google (HTTP ${gasResponse.status}): ${errorText.substring(0, 100)}...` }),
            };
        }

        gasResult = await gasResponse.json();
        console.log("Réponse de Google Apps Script :", gasResult);

        if (gasResult.success === false) {
            console.error("Erreur signalée par Google Apps Script lors de la mise à jour de la feuille :", gasResult.message);
            return {
                statusCode: 500,
                body: JSON.stringify({ success: false, message: `Erreur à la feuille Google : ${gasResult.message}` }),
            };
        }

        // Si tout s'est bien passé (email envoyé et GAS a retourné success: true)
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "Demande envoyée avec succès (mail et feuille) !" }),
        };

    } catch (gasError) {
        console.error("Erreur lors de la communication avec Google Apps Script ou du parsing de sa réponse :", gasError);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `Erreur interne du serveur lors de la communication avec la feuille Google : ${gasError.message}` }),
        };
    }
};
