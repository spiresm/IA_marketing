// cas-usages.js

// Déclarons tipsData comme une variable globale mutable, elle sera remplie par l'API
let tipsData = [];
// votesData reste pour gérer les votes localement, mais sera à adapter pour une persistance future
let votesData = JSON.parse(localStorage.getItem('votesData') || '[]');

// Fonction pour charger les tips depuis la fonction Netlify
async function loadTips() {
    try {
        // Appelle la fonction Netlify que nous avons créée
        const response = await fetch('/.netlify/functions/get-tips-test');

        if (!response.ok) {
            // Si la réponse n'est pas OK (ex: 404, 500), lance une erreur
            throw new Error(`Erreur HTTP! Statut: ${response.status}`);
        }

        // Récupère les données JSON de la réponse
        const fetchedTips = await response.json();

        // Met à jour tipsData avec les données récupérées
        tipsData = fetchedTips;

        // Assurez-vous que votesData a la bonne taille si nécessaire
        // Pour l'instant, on laisse les votes fonctionner en local, mais cela sera à revoir
        // quand les tips seront vraiment persistants sur GitHub.
        while (votesData.length < tipsData.length) votesData.push({ up: 0, down: 0 });
        localStorage.setItem('votesData', JSON.stringify(votesData));

        // Initialise les filtres et affiche les tips
        initFilters();
        renderTips();

    } catch (error) {
        console.error("Erreur lors du chargement des tips :", error);
        // Affiche un message d'erreur à l'utilisateur sur la page
        document.getElementById('tips').innerHTML = '<p style="color: red; text-align: center;">Impossible de charger les tips. Veuillez réessayer plus tard.</p>';
    }
}

// Fonction pour sauvegarder les votes (reste en local pour l'instant)
function saveVotes() {
    localStorage.setItem('votesData', JSON.stringify(votesData));
}

// Initialise les options des filtres d'outils
function initFilters() {
    const outilSelect = document.getElementById("filtre-outil");
    // Crée une liste unique et triée des outils à partir de tipsData
    const outils = [...new Set(tipsData.map(t => t.outil))].sort();
    // Construit les options du select
    outilSelect.innerHTML = '<option value="">Tous les outils</option>' + outils.map(o => `<option>${o}</option>`).join('');
}

// Rend les tips dans le conteneur HTML
function renderTips() {
    const search = document.getElementById('search').value.toLowerCase();
    const outilFilter = document.getElementById('filtre-outil').value;
    const catFilter = document.getElementById('filtre-categorie').value;
    const container = document.getElementById('tips');
    container.innerHTML = ''; // Vide le conteneur avant de le remplir

    tipsData.forEach((tip, i) => {
        // Logique de filtrage
        const haystack = (tip.titre + tip.description + tip.prompt).toLowerCase();
        if ((search && !haystack.includes(search)) || (outilFilter && tip.outil !== outilFilter) || (catFilter && tip.categorie !== catFilter)) {
            return; // Passe au tip suivant si les filtres ne correspondent pas
        }

        // Crée l'élément HTML pour chaque tip
        const div = document.createElement('div');
        div.className = 'tip';
        div.onclick = () => toggleDetails(div); // Gère l'affichage/masquage des détails

        div.innerHTML = `
            <h2>${tip.titre}</h2>
            <div class="tip-details">
                <p>${tip.description}</p>
                <div class="prompt-box">
                    <code id="prompt-${i}" contenteditable>${tip.prompt}</code>
                    <button onclick="copierPrompt('prompt-${i}', event)">📋</button>
                </div>
                <div class="tip-category">Outil : ${tip.outil} • Catégorie : ${tip.categorie}</div>
                <div class="votes">
                    <button onclick="vote(${i}, 'up', event)">👍</button><span id="up-${i}">${votesData[i] ? votesData[i].up : 0}</span>
                    <button onclick="vote(${i}, 'down', event)">👎</button><span id="down-${i}">${votesData[i] ? votesData[i].down : 0}</span>
                </div>
            </div>`;
        container.appendChild(div); // Ajoute le tip au conteneur
    });
}

// Gère le système de vote (toujours en local pour l'instant)
function vote(i, type, e) {
    e.stopPropagation(); // Empêche l'ouverture/fermeture du tip
    if (!votesData[i]) votesData[i] = { up: 0, down: 0 };
    votesData[i][type]++;
    document.getElementById(`${type}-${i}`).textContent = votesData[i][type];
    saveVotes();
}

// Ouvre/ferme les détails d'un tip
function toggleDetails(el) {
    const details = el.querySelector('.tip-details');
    // Ferme tous les autres détails ouverts
    document.querySelectorAll('.tip-details').forEach(d => {
        if (d !== details) d.style.display = 'none';
    });
    // Ouvre ou ferme les détails du tip cliqué
    details.style.display = details.style.display === 'block' ? 'none' : 'block';
}

// Copie le prompt dans le presse-papiers
function copierPrompt(id, e) {
    e.stopPropagation(); // Empêche l'ouverture/fermeture du tip
    const content = document.getElementById(id).textContent;
    navigator.clipboard.writeText(content).then(() => alert('Prompt copié !'));
}

// Initialisation au chargement du script
// Ceci lance le processus de chargement des tips depuis la fonction Netlify
loadTips();
