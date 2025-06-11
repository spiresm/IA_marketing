// ...
export const handler = async (event, context) => {
    console.log("------------------- Début de l'exécution de delete-tip.mjs -------------------");
    console.log("Méthode HTTP reçue:", event.httpMethod);
    console.log("Corps de l'événement reçu:", event.body); // <<< C'EST CETTE LIGNE QUI NOUS MONTRE L'ID QUE LE FRONTEND ENVOIE
    // ... le reste du code
}
