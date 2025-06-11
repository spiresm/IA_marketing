// netlify/functions/getProfils.js

exports.handler = async (event, context) => {
    try {
        // C'EST CETTE LIGNE QUI DOIT ÊTRE MODIFIÉE !
        // AVANT : const { Octokit } = require("@octokit/rest");
        // APRÈS :
        const { Octokit } = await import("@octokit/rest");

        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });

        // Adaptez la logique ci-dessous selon ce que vous voulez récupérer de GitHub
        // Par exemple, pour lister des membres d'une organisation :
        const { data } = await octokit.rest.orgs.listMembersForOrg({
            org: "NomDeVotreOrganisation", // <--- REMPLACEZ PAR VOTRE NOM D'ORGANISATION
        });

        // Ou pour obtenir un utilisateur spécifique :
        // const { data } = await octokit.rest.users.getByUsername({
        //     username: "octocat", // <--- REMPLACEZ PAR UN NOM D'UTILISATEUR
        // });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error("Erreur dans la fonction getProfils:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                error: "Échec du chargement des profils. Vérifiez les logs Netlify.",
                details: error.message // Utile pour le débogage côté client (attention à la sensibilité des infos)
            }),
        };
    }
};
