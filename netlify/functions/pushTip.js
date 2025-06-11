// netlify/functions/pushTip.js

const { Octokit } = require('@octokit/rest');

// --- ⚠️ ADAPTEZ CES VALEURS À VOTRE DÉPÔT ET FICHIER JSON ⚠️ ---
const DATA_FILE_PATH = 'src/data/tips.json'; // Chemin vers le fichier JSON qui stockera vos tips/cas-usages
const BRANCH_NAME = 'main'; // Le nom de votre branche principale (souvent 'main' ou 'master')
const GITHUB_OWNER = 'votre_nom_utilisateur_github'; // REMPLACEZ PAR VOTRE NOM D'UTILISATEUR GITHUB
const GITHUB_REPO = 'votre_nom_du_depot'; // REMPLACEZ PAR LE NOM DE VOTRE DÉPÔT GITHUB
// -----------------------------------------------------------

exports.handler = async (event, context) => {
    // Vérifie que la méthode HTTP est bien POST (comme attendu pour les soumissions de formulaire)
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Netlify Forms envoie le corps de l'événement en JSON, et les données du formulaire sont dans 'payload.data'
        const payload = JSON.parse(event.body);
        const formData = payload.data; // C'est ici que Netlify met les données du formulaire soumis

        // Extrait les champs nécessaires du formulaire
        const { auteur, outil, chaine, texte, imageUrl } = formData;

        // Validation basique : s'assurer que les champs essentiels sont présents
        if (!auteur || !outil || !chaine || !texte) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Certains champs obligatoires du formulaire sont manquants.' }),
            };
        }

        // Récupère le Personal Access Token GitHub depuis les variables d'environnement Netlify
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            console.error('Erreur: La variable GITHUB_TOKEN n\'est pas définie dans Netlify.');
            throw new Error('Le token GitHub n\'a pas été trouvé dans les variables d\'environnement Netlify.');
        }

        // Initialise l'Octokit pour interagir avec l'API GitHub
        const octokit = new Octokit({ auth: githubToken });

        let existingContent = []; // Contenu actuel du fichier JSON
        let sha = null; // SHA (checksum) du fichier, nécessaire pour mettre à jour un fichier existant sur GitHub

        // Tente de récupérer le contenu actuel du fichier JSON depuis GitHub
        try {
            const { data } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: DATA_FILE_PATH,
                ref: BRANCH_NAME, // La branche sur laquelle le fichier se trouve
            });

            sha = data.sha; // Enregistre le SHA du fichier actuel
            // Décode le contenu du fichier (qui est en base64) et le parse en JSON
            const contentBuffer = Buffer.from(data.content, 'base64');
            existingContent = JSON.parse(contentBuffer.toString());
            console.log(`Fichier ${DATA_FILE_PATH} trouvé avec ${existingContent.length} entrées.`);

        } catch (error) {
            // Si le fichier n'est pas trouvé (status 404), c'est qu'il n'existe pas encore.
            // On commencera avec un tableau vide, et GitHub le créera.
            if (error.status === 404) {
                console.log(`Le fichier ${DATA_FILE_PATH} n'existe pas encore, il sera créé lors de cette soumission.`);
            } else {
                // Gère toute autre erreur lors de la récupération du fichier
                console.error('Erreur lors de la récupération du contenu existant du fichier :', error.message);
                throw new Error(`Échec de la récupération des données existantes : ${error.message}`);
            }
        }

        // Crée un objet pour le nouveau "tip" avec un ID unique et un horodatage
        const newTip = {
            id: Date.now().toString(), // Un ID unique basé sur le timestamp (simple mais efficace)
            auteur: auteur,
            outil: outil,
            chaine: chaine,
            texte: texte,
            imageUrl: imageUrl || null, // L'URL de l'image (sera null si aucune image n'est uploadée)
            date: new Date().toISOString(), // Horodatage précis de la soumission
        };

        // Ajoute le nouveau tip au début du tableau (pour afficher les plus récents en premier)
        existingContent.unshift(newTip);
        // Convertit le tableau mis à jour en chaîne JSON formatée (pour une meilleure lisibilité dans Git)
        const updatedContent = JSON.stringify(existingContent, null, 2);

        // Met à jour (ou crée) le fichier sur GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: DATA_FILE_PATH,
            message: `feat(tip): Nouveau cas d'usage de ${auteur}`, // Message du commit Git
            content: Buffer.from(updatedContent).toString('base64'), // Le contenu doit être encodé en base64
            sha: sha, // Le SHA est obligatoire pour mettre à jour un fichier existant
            branch: BRANCH_NAME, // La branche sur laquelle faire le commit
        });

        console.log(`Fichier ${DATA_FILE_PATH} mis à jour sur GitHub. Un nouveau déploiement Netlify va démarrer automatiquement.`);

        // Retourne un succès à Netlify Forms
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Tip sauvegardé sur GitHub et déploiement Netlify déclenché.' }),
        };

    } catch (error) {
        // Gère les erreurs générales
        console.error('Erreur critique lors du traitement du tip et de la mise à jour GitHub :', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: `Échec de la sauvegarde du tip : ${error.message}` }),
        };
    }
};
