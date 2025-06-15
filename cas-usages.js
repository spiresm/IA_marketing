<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cas d'usages IA</title>
    <link rel="stylesheet" href="style.css" /> <style>
        /* CSS spécifique au loader (conservé mais caché par défaut pour la flexibilité) */
        #loader {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 2.5em;
            font-family: Arial, sans-serif;
            color: #0077b6;
            z-index: 9999;
            opacity: 1;
            transition: opacity 0.5s ease-out;
        }

        #loader.hidden {
            opacity: 0;
            pointer-events: none;
        }

        /* Styles généraux du body et du layout */
        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #f2f4f8;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        /* Styles du conteneur principal */
        main {
            padding: 20px;
            max-width: 1200px;
            margin: 20px auto;
            flex-grow: 1;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        /* Styles pour les filtres et la recherche */
        .filters-search {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-color: #e9ecef;
            border-radius: 8px;
        }

        .filters-search label {
            font-weight: bold;
            color: #333;
        }

        .filters-search select,
        .filters-search input[type="text"] {
            padding: 10px 15px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 1rem;
            min-width: 180px;
        }

        /* Styles pour les Tips */
        #tips {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
        }

        .tip {
            background-color: #ffffff;
            border: 1px solid #dee2e6;
            border-left: 8px solid #0077b6;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            padding: 25px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            position: relative; /* Nécessaire pour le z-index du tip actif */
            display: flex;
            flex-direction: column;
            justify-content: space-between; /* Pour pousser le footer en bas */
        }

        .tip:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .tip h2 {
            color: #0077b6;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.4rem;
        }

        /* Style pour le tip actif */
        .tip.active {
            border-color: #00bcd4; /* Changer la couleur de la bordure pour le tip actif */
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15); /* Ombre plus prononcée */
            z-index: 10; /* Assure qu'il est au-dessus des autres quand il est ouvert */
        }

        .tip-details {
            display: none; /* Masqué par défaut */
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .tip-details p {
            font-size: 0.95rem;
            line-height: 1.6;
            color: #555;
            margin-bottom: 15px;
        }

        .prompt-box {
            background-color: #f8f9fa;
            border: 1px solid #e2e6ea;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            position: relative;
        }

        .prompt-box code {
            display: block;
            white-space: pre-wrap; /* Conserver les retours à la ligne */
            word-break: break-word; /* Gérer les longs mots */
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9rem;
            color: #343a40;
            padding-right: 40px; /* Espace pour le bouton copier */
            min-height: 50px; /* Hauteur minimale pour le prompt */
            outline: none; /* Pas de contour au focus */
        }

        .prompt-box button {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: #0077b6;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background-color 0.2s ease;
        }

        .prompt-box button:hover {
            background-color: #005f8c;
        }

        .tip-category {
            font-size: 0.85rem;
            color: #777;
            margin-top: 10px;
            margin-bottom: 15px;
        }

        .votes {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 15px;
            font-size: 0.9rem;
            color: #555;
        }

        .votes button {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 1.1rem;
            transition: background-color 0.2s ease;
        }

        .votes button:hover {
            background-color: #e0e0e0;
        }

        /* Style pour le conteneur d'images dans un tip */
        .tip-images {
            display: flex;
            flex-wrap: wrap;
            gap: 10px; /* Espace entre les images */
            margin-top: 15px;
            margin-bottom: 15px;
            justify-content: center; /* Centrer les images */
        }

        .tip-images img {
            max-width: 100px; /* Taille maximale des miniatures */
            height: auto;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
        }

        .tip-images img:hover {
            transform: scale(1.05); /* Effet au survol */
        }

        /* Styles Lightbox */
        #lightbox {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            cursor: pointer;
        }

        #lightbox img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border: 2px solid white;
            border-radius: 5px;
        }


        /* Style pour le footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: #777;
            font-size: 0.85rem;
            margin-top: auto;
        }
    </style>
</head>
<body>
    <div id="loader" class="hidden">
        Chargement...
    </div>

    <div id="header-placeholder"></div>

    <main>
        <h1>Bibliothèque de Cas d'Usages & Tips IA</h1>

        <div class="filters-search">
            <label for="search">Rechercher :</label>
            <input type="text" id="search" onkeyup="renderTips()" placeholder="Titre, description, prompt..." />

            <label for="filtre-outil">Outil :</label>
            <select id="filtre-outil" onchange="renderTips()">
                <option value="">Tous les outils</option>
            </select>

            <label for="filtre-categorie">Catégorie :</label>
            <select id="filtre-categorie" onchange="renderTips()">
                <option value="">Toutes les catégories</option>
            </select>
        </div>

        <div id="tips">
            <p style="text-align: center;">Chargement des tips...</p>
        </div>
    </main>

    <footer class="footer">
        Auteur : **Steeve Pires Madeira / Marketing - Equipe Créa**
    </footer>

    <script>
        // cas-usages.js

        let tipsData = [];
        // Les votes resteront locaux pour l'instant.
        let votesData = JSON.parse(localStorage.getItem('votesData') || '[]');

        // URL pour la Netlify Function qui récupère les données
        const PROXY_URL = "/.netlify/functions/proxy"; // Si vous avez un proxy pour get-tips
        // Ou directement l'URL de la Netlify Function get-tips si elle est exposée
        const GET_TIPS_URL = "/.netlify/functions/get-tips"; 

        async function loadTips() {
            try {
                // Appel à la fonction Netlify qui lit all-tips.json
                const response = await fetch(GET_TIPS_URL); 

                if (!response.ok) {
                    throw new Error(`Erreur HTTP! Statut: ${response.status}`);
                }

                const fetchedTips = await response.json();
                tipsData = fetchedTips;

                // Si des votes existaient pour d'anciens tips, on s'assure que votesData est assez grand.
                // Cela reste une gestion simple, idéalement chaque vote devrait être lié à un ID unique du tip.
                while (votesData.length < tipsData.length) votesData.push({ up: 0, down: 0 });
                localStorage.setItem('votesData', JSON.stringify(votesData));

                initFilters();
                renderTips();

            } catch (error) {
                console.error("Erreur lors du chargement des tips :", error);
                document.getElementById('tips').innerHTML = '<p style="color: red; text-align: center;">Impossible de charger les tips. Veuillez réessayer plus tard.</p>';
            }
        }

        function saveVotes() {
            localStorage.setItem('votesData', JSON.stringify(votesData));
        }

        function initFilters() {
            const outilSelect = document.getElementById("filtre-outil");
            const outils = [...new Set(tipsData.map(t => t.outil))].sort();
            outilSelect.innerHTML = '<option value="">Tous les outils</option>' + outils.map(o => `<option>${o}</option>`).join('');

            const categorieSelect = document.getElementById("filtre-categorie");
            if (categorieSelect) {
                const categories = [...new Set(tipsData.map(t => t.categorie))].sort();
                categorieSelect.innerHTML = '<option value="">Toutes les catégories</option>' + categories.map(c => `<option>${c}</option>`).join('');
            }
        }

        // Nouvelle fonction pour cacher tous les détails
        function hideAllDetails() {
            document.querySelectorAll('.tip-details').forEach(d => {
                d.style.display = 'none';
                d.parentNode.classList.remove('active'); // Retirer la classe 'active' du tip parent
            });
        }

        function renderTips() {
            const search = document.getElementById('search').value.toLowerCase();
            const outilFilter = document.getElementById('filtre-outil').value;
            const catFilter = document.getElementById('filtre-categorie').value;
            const container = document.getElementById('tips');
            container.innerHTML = '';

            tipsData.forEach((tip, i) => {
                const haystack = (tip.titre + tip.description + tip.prompt + tip.auteur + tip.outil + tip.categorie).toLowerCase();
                if ((search && !haystack.includes(search)) || (outilFilter && tip.outil !== outilFilter) || (catFilter && tip.categorie !== catFilter)) {
                    return;
                }

                const div = document.createElement('div');
                div.className = 'tip';
                div.onclick = () => toggleDetails(div, tip, i); // Passage de l'objet tip et de son index

                // Ajout conditionnel des images
                const imagesHtml = tip.images && tip.images.length > 0
                    ? `<div class="tip-images">${tip.images.map(img => `<img src="${img}" alt="Image du tip" onclick="openLightbox('${img}', event)">`).join('')}</div>`
                    : '';

                div.innerHTML = `
                    <h2>${tip.titre}</h2>
                    <div class="tip-details">
                        <p>${tip.description}</p>
                        ${imagesHtml} <div class="prompt-box">
                            <code id="prompt-${i}" contenteditable>${tip.prompt}</code>
                            <button onclick="copierPrompt('prompt-${i}', event)">📋</button>
                        </div>
                        <div class="tip-category">Outil : ${tip.outil} • Catégorie : ${tip.categorie} • Auteur : ${tip.auteur || 'Inconnu'}</div>
                        <div class="votes">
                            <button onclick="vote(${i}, 'up', event)">👍</button><span id="up-${i}">${votesData[i] ? votesData[i].up : 0}</span>
                            <button onclick="vote(${i}, 'down', event)">👎</button><span id="down-${i}">${votesData[i] ? votesData[i].down : 0}</span>
                        </div>
                    </div>`;
                container.appendChild(div);
            });
        }

        function vote(i, type, e) {
            e.stopPropagation(); // Empêche le clic de voter d'affecter le toggleDetails
            if (!votesData[i]) votesData[i] = { up: 0, down: 0 };
            votesData[i][type]++;
            document.getElementById(`${type}-${i}`).textContent = votesData[i][type];
            saveVotes();
        }

        function toggleDetails(el, tip, index) {
            const details = el.querySelector('.tip-details');

            // Si on clique sur le tip actif, on le ferme
            if (el.classList.contains('active')) {
                hideAllDetails();
            } else {
                // Sinon, on cache tous les autres et on ouvre celui-ci
                hideAllDetails(); // Cache tous les détails ouverts
                details.style.display = 'block';
                el.classList.add('active'); // Ajoute une classe pour styliser le tip actif si besoin
            }
        }

        function copierPrompt(id, e) {
            e.stopPropagation(); // Empêche le clic de copier d'affecter le toggleDetails
            const content = document.getElementById(id).textContent;
            navigator.clipboard.writeText(content).then(() => alert('Prompt copié !'));
        }

        // --- Nouvelle fonctionnalité : Lightbox pour les images ---
        function openLightbox(imageUrl, event) {
            event.stopPropagation(); // Empêche le clic sur l'image de fermer/ouvrir les détails du tip
            const lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                cursor: pointer;
            `;
            // Ferme la lightbox si on clique en dehors de l'image
            lightbox.onclick = (e) => {
                if (e.target.id === 'lightbox') {
                    document.body.removeChild(lightbox);
                }
            };

            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                border: 2px solid white;
                border-radius: 5px;
            `;
            img.onclick = (e) => e.stopPropagation(); // Empêche le clic sur l'image de fermer la lightbox

            lightbox.appendChild(img);
            document.body.appendChild(lightbox);
        }

        // Événement pour cacher les détails quand on clique en dehors
        document.addEventListener('click', (event) => {
            // Vérifie si le clic n'était pas à l'intérieur d'un élément .tip ou sur la lightbox
            const isClickInsideTip = event.target.closest('.tip');
            const isClickOnLightbox = event.target.closest('#lightbox');

            if (!isClickInsideTip && !isClickOnLightbox) {
                hideAllDetails();
            }
        });

        // --- Fonctions globales de l'application ---
        // Cette fonction sera appelée par le header pour mettre à jour la bulle
        async function mettreAJourBulleDemandes() {
            const notif = document.getElementById("notif-count");
            if (!notif) {
                console.warn("Élément #notif-count non trouvé. La bulle de notification ne peut pas être mise à jour.");
                return;
            }
            try {
                const res = await fetch(`${PROXY_URL}?action=getDemandesIA`);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const demandes = await res.json();
                // Si les demandes arrivent dans un objet avec une clé 'data', ajustez ici
                const demandesArray = demandes.data || demandes;
                const demandesNonTraitees = demandesArray.filter(d => d.traite === false || d.traite === "FALSE");
                notif.textContent = demandesNonTraitees.length;
                notif.style.display = demandesNonTraitees.length > 0 ? "inline-block" : "none";
            } catch (e) {
                console.error("Erreur lors de la mise à jour du compteur de demandes :", e);
                notif.style.display = "none";
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            // Charge le header (si vous avez un fichier header.html séparé)
            fetch("header.html")
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.text();
                })
                .then(data => {
                    document.getElementById("header-placeholder").innerHTML = data;

                    const demandeLink = document.querySelector("a.demandes");
                    if (demandeLink && (getComputedStyle(demandeLink).position === "static" || !getComputedStyle(demandeLink).position)) {
                        demandeLink.style.position = "relative";
                    }

                    mettreAJourBulleDemandes();

                    // Logique pour marquer le lien actif dans le menu
                    const path = location.pathname.split("/").pop();
                    const links = document.querySelectorAll("nav a");
                    links.forEach(link => {
                        if (path === "" || path === "index.html") {
                            if (link.getAttribute("href") === "index.html") {
                                link.classList.add("active");
                            }
                        } else if (link.getAttribute("href") === path) {
                            link.classList.add("active");
                        }
                    });

                    // Le loader est déjà caché par défaut via la classe 'hidden' dans le HTML
                })
                .catch(error => {
                    console.error("Erreur lors du chargement de header.html:", error);
                    document.getElementById("header-placeholder").innerHTML =
                        "<p style='color:red;text-align:center'>Erreur de chargement du menu</p>";
                });

            // Lance le chargement des tips une fois le DOM prêt
            loadTips();
        });

        // La fonction `envoyer()` pour ChatGPT n'est pas pertinente pour cette page,
        // mais si elle était incluse, elle irait ici.
        // Assurez-vous de bien structurer vos scripts par page pour éviter le code inutile.
    </script>
</body>
</html>
