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
    // script.js

// --- Variables globales et fonctions utilitaires communes à tout le site ---
// Celles-ci devraient être au début de votre script.js
const globalLoader = document.getElementById("global-loader"); // Renommé de 'loader' à 'globalLoader' pour cohérence
const bodyElement = document.body;
const mainElement = document.querySelector("main"); // Sélectionne directement l'élément main

// Fonction utilitaire pour charger des composants HTML (celle que je vous ai déjà donnée)
async function loadComponent(url, placeholderId) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            const errorDetail = await res.text();
            throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}. URL: ${url}. Response: ${errorDetail.substring(0, 200)}...`);
        }
        document.getElementById(placeholderId).innerHTML = await res.text();
        console.log(`Composant ${url} chargé avec succès dans #${placeholderId}.`);
    } catch (error) {
        console.error(`Erreur lors du chargement de ${url}:`, error);
        document.getElementById(placeholderId).innerHTML = `<p style='color:red;text-align:center;'>Erreur de chargement du composant: ${url}. (${error.message})</p>`;
    }
}

// Si vous avez une fonction initializeDarkMode, elle devrait être ici aussi
function initializeDarkMode() {
    // ... votre logique pour le mode sombre ...
}

// Fonction utilitaire pour extraire l'ID d'une vidéo YouTube (déjà présente dans votre code)
function getYouTubeVideoId(url) { /* ... */ }

// Fonction pour ajouter un message au chatbot (déjà présente dans votre code)
function appendMessage(text, ...classes) { /* ... */ }

// Fonction pour créer une carte (Cas d'usage ou Galerie) (déjà présente dans votre code)
const createCard = (item, type) => { /* ... */ };

// Fonction pour envoyer un message au chatbot (déjà présente dans votre code)
async function sendMessage() { /* ... */ }


// --- Logique spécifique à la page d'accueil (index.html) ---
// Encapsulez toute la logique de cette page dans une fonction dédiée.
function initHomePage() {
    console.log("Initialisation spécifique à index.html");

    // Références DOM spécifiques à cette page (déplacées ici)
    const PROXY_URL = "/.netlify/functions/proxy"; // Définir ou passer en paramètre si commun
    const GET_TIPS_URL = "/.netlify/functions/get-tips";
    const GET_PROMPTS_URL = "/.netlify/functions/getGalleryPrompts";

    const headerPlaceholder = document.getElementById("header-placeholder"); // Ces deux sont globales mais leurs références sont souvent locales à l'initiation
    const footerPlaceholder = document.getElementById("footer-placeholder");
    const latestAdditionsGrid = document.getElementById("latest-additions-grid");

    const chatbotFab = document.getElementById('chatbot-fab');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSendButton = document.getElementById('chatbot-send-button');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotLoading = document.getElementById('chatbot-loading');

    const welcomeModal = document.getElementById('welcomeModal');
    const closeButton = document.querySelector('#welcomeModal .close-button');
    const confirmWelcomeButton = document.getElementById('confirmWelcome');

    const HAS_SEEN_WELCOME_MODAL = 'hasSeenWelcomeModal';

    // Fonctions spécifiques à cette page (displayLatestAdditions, sendMessage, etc.)
    // Elles doivent être définies à l'intérieur de `initHomePage` ou passées en tant que dépendances
    // si elles ont besoin d'accéder aux variables locales de `initHomePage`.
    // Pour `sendMessage`, `appendMessage`, `getYouTubeVideoId`, ces fonctions peuvent rester globales car elles sont des utilitaires.

    // Mettez ici la fonction `displayLatestAdditions`
    async function displayLatestAdditions() { /* ... */ }


    // --- Logique d'événements pour la page d'accueil ---
    // Modale de bienvenue
    const hasSeenWelcomeModal = localStorage.getItem(HAS_SEEN_WELCOME_MODAL) === 'true';
    if (!hasSeenWelcomeModal && welcomeModal) {
        welcomeModal.style.display = 'flex';
    } else if (welcomeModal) {
        welcomeModal.style.display = 'none';
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            localStorage.setItem(HAS_SEEN_WELCOME_MODAL, 'true');
        });
    }
    if (confirmWelcomeButton) {
        confirmWelcomeButton.addEventListener('click', () => {
            welcomeModal.style.display = 'none';
            localStorage.setItem(HAS_SEEN_WELCOME_MODAL, 'true');
        });
    }
    if (welcomeModal) {
        welcomeModal.addEventListener('click', (event) => {
            if (event.target === welcomeModal) {
                welcomeModal.style.display = 'none';
                localStorage.setItem(HAS_SEEN_WELCOME_MODAL, 'true');
            }
        });
    }

    // Chatbot
    if (chatbotFab) {
        chatbotFab.addEventListener('click', () => {
            chatbotContainer.style.display = chatbotContainer.style.display === 'flex' ? 'none' : 'flex';
            if (chatbotContainer.style.display === 'flex') {
                chatbotInput.focus();
            }
        });
    }
    if (chatbotToggle) {
        chatbotToggle.addEventListener('click', () => {
            chatbotContainer.style.display = 'none';
        });
    }
    if (chatbotSendButton && chatbotInput) {
        chatbotSendButton.addEventListener('click', sendMessage);
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    } else {
        console.warn("Éléments du chatbot (bouton d'envoi ou champ de saisie) introuvables.");
    }

    // Appel à la fonction qui charge les données spécifiques à cette page
    displayLatestAdditions();
}


// --- Point d'entrée principal pour toutes les pages (similaire à compresseur.html) ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Global script: DOMContentLoaded, début de l'initialisation...");

    // Masquer la barre de défilement du body au début pour une meilleure expérience
    bodyElement.style.overflow = 'hidden';

    // 1. Charger les composants principaux (Header et Footer)
    await loadComponent("header.html", "header-placeholder");
    await loadComponent("footer.html", "footer-placeholder");

    // 2. Mettre à jour l'état actif du menu après le chargement du header
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(link => {
        const linkHref = link.getAttribute('href');
        const linkFileName = linkHref ? linkHref.split('/').pop() : '';
        if (linkFileName === currentPath || (currentPath === "" && linkFileName === "index.html")) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    // 3. Initialiser le mode sombre (si la fonction est définie globalement)
    if (typeof initializeDarkMode === 'function') {
        initializeDarkMode();
    } else {
        console.warn("Fonction initializeDarkMode non trouvée. Assurez-vous qu'elle est disponible.");
    }

    // 4. Cacher le loader global et révéler le contenu principal
    const loader = document.getElementById("global-loader"); // Utiliser global-loader
    if (loader) {
        loader.classList.add("hidden");
        loader.addEventListener('transitionend', () => {
            if (loader.classList.contains('hidden')) {
                loader.style.display = 'none';
            }
        }, { once: true });
    }

    // Révéler le body et main
    bodyElement.classList.add("show");
    // Si main n'a pas de classe 'show' spécifique, il est révélé avec le body
    // Si vous avez `main.show` dans votre CSS pour une transition séparée, ajoutez :
    // mainElement.classList.add("show");
    bodyElement.style.overflow = ''; // Restaurer le défilement du body

    // 5. Appeler les fonctions d'initialisation spécifiques à la page actuelle
    if (currentPath === 'index.html' || currentPath === '') {
        initHomePage();
    } else if (currentPath === 'creer-tip.html') {
        // initCreerTipPage(); // Appeler cette fonction si elle est définie dans script.js
    } else if (currentPath === 'cas-usages.html') {
        // initCasUsagesPage(); // Appeler cette fonction si elle est définie dans script.js
    } else if (currentPath === 'compresseur.html') {
        // initCompresseurPage(); // Appeler cette fonction si elle est définie dans script.js
    }
    // ... ajoutez des conditions pour chaque page

    console.log("Global script: Initialisation terminée.");
});
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
