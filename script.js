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

// --- Variables globales et fonctions utilitaires communes à tout le site ---
const globalLoader = document.getElementById("global-loader");
const bodyElement = document.body;
const mainElement = document.querySelector("main");

// Fonction utilitaire pour charger des composants HTML
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

// Fonction pour initialiser le mode sombre (exemple, à implémenter si nécessaire)
function initializeDarkMode() {
    // Logique pour gérer le mode sombre
    console.log("Initialisation du mode sombre.");
}

// Fonction utilitaire pour extraire l'ID d'une vidéo YouTube
function getYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Fonction pour ajouter un message au chatbot
function appendMessage(text, ...classes) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    if (!chatbotMessages) {
        console.warn("Élément #chatbot-messages non trouvé.");
        return;
    }
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', ...classes);
    msgDiv.textContent = text;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Scroll to the bottom
}

// Fonction pour créer une carte (Cas d'usage ou Galerie)
const createCard = (item, type) => {
    const card = document.createElement('div');
    card.className = 'card';
    let content = `<h3>${item.title}</h3>`;
    if (item.description) {
        content += `<p>${item.description}</p>`;
    }
    if (type === 'gallery' && item.youtubeUrl) {
        const videoId = getYouTubeVideoId(item.youtubeUrl);
        if (videoId) {
            content += `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        }
    }
    if (item.tags && item.tags.length > 0) {
        content += `<div class="tags">${item.tags.map(tag => `<span>${tag}</span>`).join('')}</div>`;
    }
    card.innerHTML = content;
    return card;
};

// Fonction pour envoyer un message au chatbot
async function sendMessage() {
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotLoading = document.getElementById('chatbot-loading');
    const PROXY_URL = "/.netlify/functions/proxy"; // Assurez-vous que PROXY_URL est défini globalement ou passé

    if (!chatbotInput || !chatbotLoading) {
        console.warn("Éléments du chatbot (input ou loading) introuvables.");
        return;
    }

    const message = chatbotInput.value.trim();
    if (message === '') return;

    appendMessage(message, 'user-message');
    chatbotInput.value = '';
    chatbotLoading.style.display = 'block';

    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: message }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        appendMessage(data.response, 'bot-message');
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message au chatbot:', error);
        appendMessage("Désolé, une erreur est survenue. Veuillez réessayer.", 'bot-message', 'error-message');
    } finally {
        chatbotLoading.style.display = 'none';
    }
}

// Fonction pour mettre à jour la bulle de notification des demandes
// Cette fonction est cruciale et doit être accessible globalement si elle est appelée depuis plusieurs endroits.
async function mettreAJourBulleDemandes() {
    const notif = document.getElementById("notif-count");
    if (!notif) {
        console.warn("Élément #notif-count non trouvé. La bulle de notification ne peut pas être mise à jour.");
        return;
    }
    try {
        // La fonction getDemandes est définie plus bas, mais elle doit être accessible ici.
        // Si elle n'est pas globale, il faut la passer ou la définir ici.
        // Pour l'instant, on suppose qu'elle est accessible ou qu'on va la rendre globale.
        const demandes = await getDemandes(); // Appel à la fonction getDemandes
        const demandesNonTraitees = demandes.filter(d => !d.traite);
        notif.textContent = demandesNonTraitees.length;
        notif.style.display = demandesNonTraitees.length > 0 ? "inline-block" : "none";
    } catch (e) {
        console.error("Erreur lors de la mise à jour du compteur de demandes :", e);
        notif.style.display = "none";
    }
}


// --- Logique spécifique à la page d'accueil (index.html) ---
function initHomePage() {
    console.log("Initialisation spécifique à index.html");

    const PROXY_URL = "/.netlify/functions/proxy";
    const GET_TIPS_URL = "/.netlify/functions/get-tips";
    const GET_PROMPTS_URL = "/.netlify/functions/getGalleryPrompts";

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

    // Fonction `displayLatestAdditions` spécifique à la page d'accueil
    async function displayLatestAdditions() {
        if (!latestAdditionsGrid) {
            console.warn("#latest-additions-grid non trouvé. displayLatestAdditions ignorée.");
            return;
        }
        latestAdditionsGrid.innerHTML = "<p>Chargement des dernières additions...</p>";
        try {
            const res = await fetch(GET_PROMPTS_URL);
            if (!res.ok) throw new Error("Erreur lors de la récupération des prompts.");
            const prompts = await res.json();

            latestAdditionsGrid.innerHTML = ""; // Vide avant d'ajouter
            const sortedPrompts = prompts.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            sortedPrompts.slice(0, 3).forEach(prompt => { // Affiche les 3 derniers
                latestAdditionsGrid.appendChild(createCard(prompt, 'gallery'));
            });
        } catch (err) {
            console.error("Erreur lors de l'affichage des dernières additions :", err);
            latestAdditionsGrid.innerHTML = "<p>Erreur lors du chargement des dernières additions.</p>";
        }
    }

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


// --- Logique spécifique à la page des demandes (demandes.html) ---
function initDemandesPage() {
    console.log("Initialisation spécifique à demandes.html");

    // --- Initialisation du sélecteur de durée ---
    const dureeSelect = document.getElementById("duree");
    if (dureeSelect) {
        for (let i = 0; i <= 60; i++) {
            const opt = document.createElement("option");
            opt.value = `${i} sec`;
            opt.textContent = `${i} sec`;
            dureeSelect.appendChild(opt);
        }
    }

    // --- Gestion de la soumission du formulaire de demande IA ---
    document.getElementById("demandeIA")?.addEventListener("submit", async e => {
        e.preventDefault();
        const data = new FormData(e.target);
        const demande = {
            id: "_" + Math.random().toString(36).substring(2, 11),
            nom: data.get("nom"),
            email: `${data.get("emailPrefix")}@rtbf.be`,
            type: data.get("type"),
            support: data.get("support"),
            duree: data.get("duree"),
            date: data.get("date"),
            description: data.get("description"),
            chaine: data.get("chaine"),
            traite: false
        };

        try {
            const updateRes = await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demande)
            });
            if (!updateRes.ok) {
                throw new Error(`Échec de la mise à jour de la demande : ${updateRes.statusText}`);
            }

            const sendRes = await fetch("/.netlify/functions/sendRequest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demande)
            });
            if (!sendRes.ok) {
                throw new Error(`Échec de l'envoi de l'e-mail : ${sendRes.statusText}`);
            }

            alert("Demande envoyée avec succès et mail transmis !");
            e.target.reset();

        } catch (err) {
            console.error("Erreur lors de l'envoi de la demande ou de l'e-mail :", err);
            if (err.message.includes("Échec de l'envoi de l'e-mail")) {
                alert("Le ticket est créé, mais l'envoi d'e-mail a échoué.");
            } else {
                alert(`Erreur lors de l'envoi de la demande : ${err.message}. Veuillez réessayer.`);
            }
            e.target.reset();
        } finally {
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
        if (e.target.id === "modal") {
            e.target.style.display = "none";
        }
    });

    // --- Fonctions utilitaires spécifiques aux demandes ---

    // Récupère la liste des demandes depuis l'API Netlify Function
    async function getDemandes() {
        const res = await fetch("/.netlify/functions/getDemandesIA");
        if (!res.ok) throw new Error("Erreur lors de la récupération des demandes.");
        return await res.json();
    }

    // Affiche et filtre les demandes dans la liste
    async function afficherDemandes() {
        const recapList = document.getElementById("recapList");
        if (!recapList) {
            console.warn("#recapList non trouvé. La fonction afficherDemandes est ignorée.");
            hideLoader();
            return;
        }

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
            hideLoader();
            return;
        }

        demandes = demandes.filter(d => d.nom.toLowerCase().includes(filtreNom));
        if (filtreDuree) demandes = demandes.filter(d => d.duree === filtreDuree);

        if (filtreDate === "asc") {
            demandes.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (filtreDate === "desc") {
            demandes.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        recapList.innerHTML = "";

        if (demandes.length === 0) {
            recapList.innerHTML = "<p>Aucune demande trouvée avec les filtres actuels.</p>";
        } else {
            demandes.forEach(d => {
                const couleur = couleursParChaine[d.chaine] || "#0077b6";
                const div = document.createElement("div");
                div.className = "ticket";
                div.style.borderLeftColor = couleur;
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

                div.querySelector(".btn-supprimer")?.addEventListener("click", async e => {
                    e.stopPropagation();
                    if (confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
                        await supprimerDemande(d.id);
                    }
                });

                div.querySelector(".btn-traite")?.addEventListener("click", async e => {
                    e.stopPropagation();
                    await marquerTraite(d.id);
                });

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
                        modal.style.display = "flex";
                    }
                });

                recapList.appendChild(div);
            });
        }
        hideLoader();
    }

    // Supprime une demande
    async function supprimerDemande(id) {
        try {
            const demandes = await getDemandes();
            const filtered = demandes.filter(d => d.id !== id);
            await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filtered),
            });
            alert("Demande supprimée avec succès !");
            afficherDemandes();
            mettreAJourBulleDemandes();
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
            demandeToUpdate.traite = true;

            await fetch("/.netlify/functions/updateDemandeIA", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(demandes),
            });
            alert("Demande marquée comme traitée !");
            afficherDemandes();
            mettreAJourBulleDemandes();
        } catch (err) {
            console.error("Erreur lors du marquage comme traité :", err);
            alert("Erreur lors du marquage de la demande comme traitée.");
        }
    }

    // Fonction pour masquer le loader
    function hideLoader() {
        const loader = document.getElementById('loader'); // Loader spécifique à cette page si différent du global
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // Appel initial des fonctions au chargement de la page des demandes
    afficherDemandes();
    mettreAJourBulleDemandes();
}


// --- Point d'entrée principal pour toutes les pages ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Global script: DOMContentLoaded, début de l'initialisation...");

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

    // 3. Initialiser le mode sombre
    if (typeof initializeDarkMode === 'function') {
        initializeDarkMode();
    } else {
        console.warn("Fonction initializeDarkMode non trouvée. Assurez-vous qu'elle est disponible.");
    }

    // 4. Cacher le loader global et révéler le contenu principal
    if (globalLoader) {
        globalLoader.classList.add("hidden");
        globalLoader.addEventListener('transitionend', () => {
            if (globalLoader.classList.contains('hidden')) {
                globalLoader.style.display = 'none';
            }
        }, { once: true });
    }

    bodyElement.classList.add("show");
    bodyElement.style.overflow = '';

    // 5. Appeler les fonctions d'initialisation spécifiques à la page actuelle
    if (currentPath === 'index.html' || currentPath === '') {
        initHomePage();
    } else if (currentPath === 'demandes.html') {
        initDemandesPage();
    }
    // Ajoutez d'autres conditions pour chaque page si nécessaire
    // else if (currentPath === 'creer-tip.html') { /* initCreerTipPage(); */ }
    // else if (currentPath === 'cas-usages.html') { /* initCasUsagesPage(); */ }
    // else if (currentPath === 'compresseur.html') { /* initCompresseurPage(); */ }

    console.log("Global script: Initialisation terminée.");
});
