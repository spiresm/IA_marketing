const tipsDataBase = [
  {
    titre: "Utiliser ChatGPT pour résumer un article",
    description: "Collez l’URL ou le contenu de l’article et demandez à ChatGPT un résumé en 3 phrases.",
    prompt: "Résume cet article en trois phrases claires et concises.",
    outil: "ChatGPT",
    categorie: "Productivité"
  },
  {
    titre: "Générer des idées de campagne marketing",
    description: "Formulez votre objectif et votre public cible, et demandez à l’IA des idées originales avec arguments.",
    prompt: "Propose 5 idées de campagne marketing créatives pour [produit/service], en précisant l’axe et la promesse.",
    outil: "Claude",
    categorie: "Marketing Digital"
  },
  {
    titre: "Créer un visuel pour les réseaux sociaux",
    description: "Utilisez Midjourney ou Firefly avec une description claire du style visuel, du format et du contexte.",
    prompt: "Génère un visuel au format carré pour une campagne [thème], style moderne, couleurs vives, accroche visible.",
    outil: "Midjourney",
    categorie: "Graphisme"
  },
  {
    titre: "Préparer un brief créatif",
    description: "Demandez à ChatGPT de structurer les points essentiels d’un brief : objectifs, cible, ton, livrables attendus.",
    prompt: "Crée un brief créatif pour une campagne destinée à [cible] avec les objectifs, le ton, les livrables attendus.",
    outil: "ChatGPT",
    categorie: "Communication"
  },
  {
    titre: "Répondre à des objections d’un partenaire avec l’IA",
    description: "Simulez un échange avec un partenaire exprimant des réticences et testez plusieurs réponses avec ChatGPT.",
    prompt: "Simule une conversation où un partenaire exprime des doutes sur une collaboration. Donne-moi des réponses diplomates et convaincantes à formuler.",
    outil: "ChatGPT",
    categorie: "Partenariats & Évènements"
  },
  {
    titre: "Optimiser un message LinkedIn pour un influenceur",
    description: "Soumettez un message à l’IA pour optimiser la clarté, le ton et l’impact avant de l’envoyer à un influenceur.",
    prompt: "Optimise ce message pour LinkedIn afin qu’il engage un influenceur dans une collaboration potentielle : [message initial].",
    outil: "Claude",
    categorie: "Com. Presse & Influenceurs"
  },
  {
    titre: "Créer une ligne éditoriale pour une newsletter CRM",
    description: "Demandez à l’IA de proposer un planning éditorial mensuel structuré autour d’objectifs CRM.",
    prompt: "Propose une ligne éditoriale mensuelle pour une newsletter CRM à destination de [cible], avec un thème et un contenu par semaine.",
    outil: "Notion AI",
    categorie: "CRM"
  },
  {
    titre: "Simuler une présentation orale avec l’IA",
    description: "Entraînez-vous à pitcher un projet à l’oral en interagissant avec une IA jouant le rôle d’un jury ou d’un client.",
    prompt: "Pose-moi des questions pour m’entraîner à présenter ce projet en 2 minutes, comme si je pitchais devant un jury : [titre du projet].",
    outil: "ChatGPT",
    categorie: "Pôle Créa"
  },
  {
    titre: "Identifier des tendances émergentes à partir de mots-clés",
    description: "Analysez des listes de mots-clés avec une IA pour en extraire des tendances et angles d’attaque éditoriaux.",
    prompt: "Voici une liste de mots-clés issus de recherches récentes : [liste]. Dresse une analyse des tendances émergentes et opportunités associées.",
    outil: "Perplexity",
    categorie: "Positionnement"
  },
  {
    titre: "Analyser automatiquement les sentiments clients",
    description: "Demandez à l’IA d’analyser les retours clients pour en dégager les sentiments positifs et négatifs.",
    prompt: "Analyse ces avis clients et distingue les 3 principaux points positifs et 3 points d’amélioration.",
    outil: "ChatGPT",
    categorie: "CRM"
  },
  {
    titre: "Générer un plan média pour une campagne digitale",
    description: "Utilisez l’IA pour proposer un plan média multicanal adapté à votre budget et cible.",
    prompt: "Propose un plan média digital sur 3 mois pour une marque [secteur], en répartissant le budget entre réseaux sociaux, display et search.",
    outil: "Claude",
    categorie: "Marketing Digital"
  },
  {
    titre: "Automatiser un reporting hebdomadaire",
    description: "Demandez à l’IA de compiler et structurer vos données clés en un rapport hebdomadaire prêt à partager.",
    prompt: "Génère un reporting hebdomadaire à partir de ces indicateurs : [liste de KPI], avec points forts et axes d’amélioration.",
    outil: "Notion AI",
    categorie: "Productivité"
  }
];

const userTips = JSON.parse(localStorage.getItem('tips') || '[]');
const tipsData = [...tipsDataBase, ...userTips];

let votesData = JSON.parse(localStorage.getItem('votesData') || '[]');
while (votesData.length < tipsData.length) votesData.push({ up: 0, down: 0 });
localStorage.setItem('votesData', JSON.stringify(votesData));

function saveVotes() {
  localStorage.setItem('votesData', JSON.stringify(votesData));
}

function initFilters() {
  const outilSelect = document.getElementById("filtre-outil");
  const outils = [...new Set(tipsData.map(t => t.outil))].sort();
  outilSelect.innerHTML = '<option value="">Tous les outils</option>' + outils.map(o => `<option>${o}</option>`).join('');
}

function renderTips() {
  const search = document.getElementById('search').value.toLowerCase();
  const outilFilter = document.getElementById('filtre-outil').value;
  const catFilter = document.getElementById('filtre-categorie').value;
  const container = document.getElementById('tips');
  container.innerHTML = '';
  tipsData.forEach((tip, i) => {
    const haystack = (tip.titre + tip.description + tip.prompt).toLowerCase();
    if ((search && !haystack.includes(search)) || (outilFilter && tip.outil !== outilFilter) || (catFilter && tip.categorie !== catFilter)) return;
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
        <div class="tip-category">Outil : ${tip.outil} • Catégorie : ${tip.categorie}</div>
        <div class="votes">
          <button onclick="vote(${i}, 'up', event)">👍</button><span id="up-${i}">${votesData[i].up}</span>
          <button onclick="vote(${i}, 'down', event)">👎</button><span id="down-${i}">${votesData[i].down}</span>
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
  document.querySelectorAll('.tip-details').forEach(d => { if (d !== details) d.style.display = 'none'; });
  details.style.display = details.style.display === 'block' ? 'none' : 'block';
}

function copierPrompt(id, e) {
  e.stopPropagation();
  const content = document.getElementById(id).textContent;
  navigator.clipboard.writeText(content).then(() => alert('Prompt copié !'));
}

// Init
initFilters();
renderTips();
