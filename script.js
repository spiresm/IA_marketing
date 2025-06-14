// Définition des couleurs par chaîne.
// Adaptez ces couleurs et noms de chaînes à vos besoins réels.
const couleursParChaine = {
    "La Une": "#E4002B",
    "Tipik": "#FF7F00",
    "VivaCité": "#00A1D3",
    "Classic 21": "#7F00FF",
    "Musique 3": "#00CC00",
    "RTBF Info": "#003366",
    "Auvio": "#FFD700",
    "Autre": "#607D8B"
    // Ajoutez d'autres chaînes et leurs couleurs si nécessaire
};

document.addEventListener("DOMContentLoaded", () => {
    // ---- Logique du Loader pour cette page (si applicable) ----
    // Cette fonction sera appelée pour masquer le loader.
    // L'appel réel se fera après le chargement des demandes.
    const loader = document.getElementById('loader');

    // --- Initialisation du sélecteur de durée ---
    const dureeSelect = document.getElementById("duree");
    // Remplit les options du sélecteur "duree" de 0 à 60 secondes
    if (dureeSelect) { // Vérifie si l'élément existe avant de le manipuler
        for (let i = 0; i <= 60; i++) {
            const opt = document.createElement("option");
            opt.value = `${i} sec`;
            opt.textContent = `${i} sec`;
            dureeSelect.appendChild(opt);
        }
    }


    // --- Gestion de la soumission du formulaire de demande IA ---
    // Un seul écouteur d'événement pour la soumission du formulaire
    document.getElementById("demandeIA")?.addEventListener("submit", async e => {
        e.preventDefault(); // Empêche le rechargement de la page par défaut
        const data = new FormData(e.target);
        const demande = {
            id: "_" + Math.random().toString(36).substring(2, 11), // Génère un ID unique
            nom: data.get("nom"),
            email: `${data.get("emailPrefix")}@rtbf.be`,
            type: data.get("type"),
            support: data.get("support"),
            duree: data.get("duree"),
            date: data.get("date"),
            description: data.get("description"),
            chaine: data.get("chaine"),
            traite: false // Nouvelle demande, donc non traitée par défaut
        };

        try {
            // Premier appel API : mettre à jour la demande dans la feuille (ou base de données)
            const updateRes = await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demande)
            });
            if (!updateRes.ok) {
                // Si le premier appel échoue, on lance une erreur pour la gérer
                throw new Error(`Échec de la mise à jour de la demande : ${updateRes.statusText}`);
            }

            // Deuxième appel API : envoyer l'e-mail de notification
            const sendRes = await fetch("/.netlify/functions/sendRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demande)
            });
            if (!sendRes.ok) {
                // Si l'envoi de l'e-mail échoue, on le notifie spécifiquement
                throw new Error(`Échec de l'envoi de l'e-mail : ${sendRes.statusText}`);
            }

            alert("Demande envoyée avec succès et mail transmis !");
            e.target.reset(); // Réinitialise le formulaire seulement si tout a réussi

        } catch (err) {
            console.error("Erreur lors de l'envoi de la demande ou de l'e-mail :", err);
            // Message d'erreur plus précis pour l'utilisateur
            if (err.message.includes("Échec de l'envoi de l'e-mail")) {
                alert("Le ticket est créé, mais l'envoi d'e-mail a échoué.");
            } else {
                alert(`Erreur lors de l'envoi de la demande : ${err.message}. Veuillez réessayer.`);
            }
            e.target.reset(); // Réinitialise le formulaire même en cas d'échec partiel
        } finally {
            // Toujours rafraîchir la liste des demandes et la bulle de notification
            afficherDemandes();
            mettreAJourBulleDemandes();
        }
    });

    // --- Écouteurs d'événements pour les filtres ---
    document.getElementById("filtreNom")?.addEventListener("input", afficherDemandes);
    document.getElementById("filtreDate")?.addEventListener("change", afficherDemandes);
    document.getElementById("filtreDuree")?.addEventListener("change", afficherDemandes);

    // --- Écouteurs d'événements pour la modale (pop-up) ---
    document.querySelector(".close-modal")?.addEventListener("click", () => {
        document.getElementById("modal").style.display = "none";
    });

    document.getElementById("modal")?.addEventListener("click", e => {
        if (e.target.id === "modal") { // Ferme la modale si on clique en dehors de son contenu
            e.target.style.display = "none";
        }
    });

    // --- Appel initial des fonctions au chargement de la page ---
    // Ces appels déclenchent l'affichage des demandes et la mise à jour de la bulle
    // après que le DOM soit prêt et que le loader puisse être masqué.
    afficherDemandes();
    mettreAJourBulleDemandes();


    // --- Fonctions utilitaires ---

    // Récupère la liste des demandes depuis l'API Netlify Function
    async function getDemandes() {
        const res = await fetch("/.netlify/functions/getDemandesIA");
        if (!res.ok) throw new Error("Erreur lors de la récupération des demandes.");
        return await res.json();
    }

    // Affiche et filtre les demandes dans la liste
    async function afficherDemandes() {
        const recapList = document.getElementById("recapList");
        // Vérifie si `recapList` existe pour éviter les erreurs sur les pages sans cet élément
        if (!recapList) {
            console.warn("#recapList non trouvé. La fonction afficherDemandes est ignorée.");
            // Si cette page n'a pas de liste, on peut masquer le loader ici si c'est la seule chose à charger
            hideLoader();
            return;
        }

        // Affiche un message de chargement pendant la récupération des données
        recapList.innerHTML = "<p>Chargement des demandes en cours...</p>";

        const filtreNom = document.getElementById("filtreNom")?.value.toLowerCase() || "";
        const filtreDate = document.getElementById("filtreDate")?.value || "";
        const filtreDuree = document.getElementById("filtreDuree")?.value || "";

        let demandes = [];
        try {
            demandes = await getDemandes();
        } catch (err) {
            console.error("Erreur lors de la récupération des demandes :", err);
            recapList.innerHTML = "<p>Erreur lors du chargement des demandes. Veuillez rafraîchir la page.</p>";
            // Masque le loader même en cas d'erreur
            hideLoader();
            return;
        }

        // Applique les filtres
        demandes = demandes.filter(d => d.nom.toLowerCase().includes(filtreNom));
        if (filtreDuree) demandes = demandes.filter(d => d.duree === filtreDuree);

        // Applique le tri par date
        if (filtreDate === "asc") {
            demandes.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (filtreDate === "desc") {
            demandes.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        recapList.innerHTML = ""; // Vide la liste avant d'ajouter les résultats

        if (demandes.length === 0) {
            recapList.innerHTML = "<p>Aucune demande trouvée avec les filtres actuels.</p>";
        } else {
            demandes.forEach(d => {
                const couleur = couleursParChaine[d.chaine] || "#0077b6"; // Utilise la couleur par défaut si la chaîne n'est pas définie
                const div = document.createElement("div");
                div.className = "ticket";
                div.style.borderLeftColor = couleur; // Bordure gauche colorée selon la chaîne
                div.innerHTML = `
                    <div style="display:flex; justify-content: space-between; align-items:center">
                        <span><strong>${d.nom}</strong></span>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:1.1em; font-weight: bold;">${d.type}</span>
                            <span>${d.duree}</span>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <span style="color:${couleur}; font-weight: bold">${d.chaine}</span>
                        <small style="color:#666;">📅 ${d.date}</small>
                    </div>
                    <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                        <div>${d.traite ? '✅ Traité' : '⏳ En attente'}</div>
                        <div>
                            ${d.traite ? '' : `<button class="btn-traite" data-id="${d.id}">✔️</button>`}
                            <button class="btn-supprimer" data-id="${d.id}">🗑️</button>
                        </div>
                    </div>`;

                // Ajoute les écouteurs pour les boutons "Supprimer" et "Traiter"
                div.querySelector(".btn-supprimer")?.addEventListener("click", async e => {
                    e.stopPropagation(); // Empêche l'ouverture de la modale en cliquant sur le bouton
                    if (confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
                        await supprimerDemande(d.id);
                    }
                });

                div.querySelector(".btn-traite")?.addEventListener("click", async e => {
                    e.stopPropagation(); // Empêche l'ouverture de la modale
                    await marquerTraite(d.id);
                });

                // Écouteur pour ouvrir la modale au clic sur le ticket
                div.addEventListener("click", () => {
                    const modal = document.getElementById("modal");
                    const modalBody = document.getElementById("modal-body");
                    if (modal && modalBody) {
                        modalBody.textContent = `
Nom: ${d.nom}
Email: ${d.email}
Type: ${d.type}
Support: ${d.support}
Durée: ${d.duree}
Date: ${d.date}
Chaîne: ${d.chaine}
Statut: ${d.traite ? 'Traité' : 'En attente'}

Description:
${d.description}`;
                        modal.style.display = "flex"; // Affiche la modale
                    }
                });

                recapList.appendChild(div); // Ajoute le ticket à la liste
            });
        }
        // Masque le loader principal une fois que les demandes sont affichées
        hideLoader();
    }

    // Supprime une demande
    async function supprimerDemande(id) {
        try {
            const demandes = await getDemandes();
            const filtered = demandes.filter(d => d.id !== id); // Filtre l'élément supprimé
            await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filtered), // Envoie la liste entière mise à jour
            });
            alert("Demande supprimée avec succès !");
            afficherDemandes(); // Rafraîchit l'affichage
            mettreAJourBulleDemandes(); // Met à jour la bulle de notification
        } catch (err) {
            console.error("Erreur lors de la suppression de la demande :", err);
            alert("Erreur lors de la suppression de la demande.");
        }
    }

    // Marque une demande comme traitée
    async function marquerTraite(id) {
        try {
            const demandes = await getDemandes();
            const demandeToUpdate = demandes.find(d => d.id === id);
            if (!demandeToUpdate) {
                console.warn(`Demande avec l'ID ${id} non trouvée.`);
                return;
            }
            demandeToUpdate.traite = true; // Met à jour le statut

            // Envoie la liste entière mise à jour au serveur
            await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demandes), // Envoie la liste entière avec l'élément mis à jour
            });
            alert("Demande marquée comme traitée !");
            afficherDemandes(); // Rafraîchit l'affichage
            mettreAJourBulleDemandes(); // Met à jour la bulle de notification
        } catch (err) {
            console.error("Erreur lors du marquage comme traité :", err);
            alert("Erreur lors du marquage de la demande comme traitée.");
        }
    }

    // Fonction pour masquer le loader
    function hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
});

// IMPORTANT : La fonction `mettreAJourBulleDemandes` est définie dans le script de `index.html`.
// Si ce `script.js` est utilisé sur une page différente (`demandes.html` par exemple)
// et que cette page doit aussi mettre à jour la bulle, vous devrez la définir ici aussi,
// ou vous assurer qu'elle est accessible globalement via un autre moyen.
// Je la laisse commentée ici pour éviter la duplication si elle est déjà dans index.html.
/*
async function mettreAJourBulleDemandes() {
    const notif = document.getElementById("notif-count");
    if (!notif) {
        console.warn("Élément #notif-count non trouvé. La bulle de notification ne peut pas être mise à jour.");
        return;
    }
    try {
        const res = await fetch(`${PROXY_URL}?action=getDemandesIA`); // Assurez-vous que PROXY_URL est défini si utilisé ici
        if (!res.ok) {
            throw new Error(`Erreur HTTP ! statut : ${res.status}`);
        }
        const demandes = await res.json();
        const demandesNonTraitees = demandes.filter(d => !d.traite);
        notif.textContent = demandesNonTraitees.length;
        notif.style.display = demandesNonTraitees.length > 0 ? "inline-block" : "none";
    } catch (e) {
        console.error("Erreur lors de la mise à jour du compteur de demandes :", e);
        notif.style.display = "none";
    }
}
*/
