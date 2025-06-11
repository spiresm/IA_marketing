// cas-usages.js

let tipsData = [];
// Les votes resteront locaux pour l'instant. Pour des votes persistants,
// il faudrait une base de données séparée ou complexifier l'écriture sur GitHub.
let votesData = JSON.parse(localStorage.getItem('votesData') || '[]');

async function loadTips() {
    try {
        // Appel à la fonction Netlify qui lit all-tips.json
        const response = await fetch('/.netlify/functions/get-tips'); // Assurez-vous que le nom correspond à votre fichier get-tips.js

        if (!response.ok) {
            throw new Error(`Erreur HTTP! Statut: ${response.status}`);
        }

        const fetchedTips = await response.json();
        tipsData = fetchedTips;

        // Si des votes existaient pour d'anciens tips, on s'assure que votesData est assez grand.
        // C'est une gestion simple, sans lien avec l'ID du tip, donc les votes peuvent être perdus
        // si l'ordre des tips change ou si des tips sont supprimés/ajoutés par d'autres.
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

    // Remplir le filtre catégorie (si vous avez un élément avec l'ID 'filtre-categorie' dans votre HTML)
    const categorieSelect = document.getElementById("filtre-categorie");
    if (categorieSelect) {
        const categories = [...new Set(tipsData.map(t => t.categorie))].sort();
        categorieSelect.innerHTML = '<option value="">Toutes les catégories</option>' + categories.map(c => `<option>${c}</option>`).join('');
    }
}

function renderTips() {
    const search = document.getElementById('search').value.toLowerCase();
    const outilFilter = document.getElementById('filtre-outil').value;
    const catFilter = document.getElementById('filtre-categorie').value;
    const container = document.getElementById('tips');
    container.innerHTML = '';

    tipsData.forEach((tip, i) => {
        // Incluez l'auteur dans la recherche si désiré
        const haystack = (tip.titre + tip.description + tip.prompt + tip.auteur + tip.outil + tip.categorie).toLowerCase();
        if ((search && !haystack.includes(search)) || (outilFilter && tip.outil !== outilFilter) || (catFilter && tip.categorie !== catFilter)) {
            return;
        }

        const div = document.createElement('div');
        div.className = 'tip';
        div.onclick = () => toggleDetails(div);

        div.innerHTML = `
            <h2>${tip.titre}</h2>
            <div class="tip-details">
                <p>${tip.description}</p>
                <div class="prompt-box">
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
    e.stopPropagation();
    if (!votesData[i]) votesData[i] = { up: 0, down: 0 };
    votesData[i][type]++;
    document.getElementById(`${type}-${i}`).textContent = votesData[i][type];
    saveVotes();
}

function toggleDetails(el) {
    const details = el.querySelector('.tip-details');
    document.querySelectorAll('.tip-details').forEach(d => {
        if (d !== details) d.style.display = 'none';
    });
    details.style.display = details.style.display === 'block' ? 'none' : 'block';
}

function copierPrompt(id, e) {
    e.stopPropagation();
    const content = document.getElementById(id).textContent;
    navigator.clipboard.writeText(content).then(() => alert('Prompt copié !'));
}

loadTips();
