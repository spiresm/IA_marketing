// tools-full.js

// Définition du tableau 'tools' avec toutes vos données d'outils
const tools = [
    {
        nom: "ChatGPT",
        description: "Assistant conversationnel basé sur GPT-4.",
        info: "ChatGPT est utilisé pour simuler des conversations humaines, répondre à des questions, rédiger des textes et automatiser des tâches grâce à la puissance du modèle GPT-4 d'OpenAI.",
        lien: "https://chat.openai.com",
        type: "texte",
        categories: ["redaction", "resume"],
        teams: ["CRM", "Com. Externe & Influenceurs"],
        rtbf: true
    },
    {
        nom: "Claude",
        description: "Assistant IA développé par Anthropic.",
        info: "Claude se distingue par une approche axée sur la sécurité et l'alignement éthique des modèles IA, idéal pour les entreprises sensibles à la responsabilité numérique.",
        lien: "https://claude.ai",
        type: "texte",
        categories: ["redaction", "resume"],
        teams: ["CRM"],
        rtbf: false
    },
    {
        nom: "Midjourney",
        description: "Générateur d’images créatives via Discord.",
        info: "Midjourney permet aux utilisateurs de générer des images artistiques à partir de descriptions textuelles, souvent utilisées pour des projets visuels ou créatifs.",
        lien: "https://midjourney.com",
        type: "image",
        categories: ["generation"],
        teams: ["Com. Externe & Influenceurs"]
    },
    {
        nom: "DALL·E",
        description: "Générateur d’images à partir de texte par OpenAI.",
        info: "DALL·E est idéal pour créer des visuels réalistes ou artistiques à partir de descriptions détaillées, utilisé dans la publicité ou la scénarisation.",
        lien: "https://openai.com/dall-e",
        type: "image",
        categories: ["generation"],
        teams: ["Com. Externe & Influenceurs"]
    },
    {
        nom: "Stable Diffusion",
        description: "Modèle open source de génération d'images.",
        info: "Stable Diffusion permet aux utilisateurs de créer localement des images avec un haut niveau de personnalisation, utile pour les développeurs et créatifs.",
        lien: "https://stability.ai",
        type: "image",
        categories: ["generation"],
        teams: ["Marketing Digital"]
    },
    {
        nom: "Firefly",
        description: "Suite d'outils IA d'Adobe pour les créateurs.",
        info: "Firefly intègre la génération d’images, de texte stylisé et d’animations directement dans les outils Adobe, favorisant la productivity créative.",
        lien: "https://firefly.adobe.com",
        type: "image",
        categories: ["generation"],
        teams: ["Pôle créa."]
    },
    {
        nom: "Runway ML",
        description: "Outils de création vidéo IA.",
        info: "Runway ML propose des fonctionnalités avancées pour l’édition vidéo, la génération de contenus animés et le compositing via l’IA, très prisé dans les domaines du cinéma et du marketing.",
        lien: "https://runwayml.com",
        type: "video",
        categories: ["generation", "montage"],
        teams: ["Marketing Digital"]
    },
    {
        nom: "Perplexity",
        description: "Moteur de recherche conversationnel IA.",
        info: "Perplexity combine recherche web et intelligence conversationnelle pour fournir des réponses précises et documentées, utile pour les professionnels de la veille.",
        lien: "https://perplexity.ai",
        type: "texte",
        categories: ["resume"],
        teams: ["CRM"]
    },
    {
        nom: "Notion AI",
        description: "Fonctionnalités IA intégrées à Notion.",
        info: "Notion AI permet de générer du contenu structuré, faire des résumés automatiques, et améliorer l’organisation des connaissances au sein des notes collaboratives.",
        lien: "https://www.notion.so/product/ai",
        type: "texte",
        categories: ["redaction"]
    },
    {
        nom: "Gemini",
        description: "Assistant multimodal Google.",
        info: "Gemini combine texte, image, audio et vidéo dans un même environnement d’interaction, facilitant les tâches complexes pour les utilisateurs professionnels.",
        lien: "https://gemini.google.com",
        type: "texte",
        categories: ["redaction", "resume"]
    },
    {
        nom: "Copilot",
        description: "Outils IA de GitHub ou Microsoft selon contexte.",
        info: "Copilot assiste les développeurs en générant automatiquement des lignes de code ou en proposant des complétions intelligentes dans les éditeurs comme VSCode.",
        lien: "https://copilot.microsoft.com",
        type: "texte",
        categories: ["code"]
    },
    {
        nom: "Bard",
        description: "Assistant IA de Google (prédécesseur de Gemini).",
        info: "Bard était conçu pour interagir de façon conversationnelle en s'appuyant sur les données du web, souvent utilisé comme outil de recherche augmentée.",
        lien: "https://bard.google.com",
        type: "texte",
        categories: ["redaction"]
    },
    {
        nom: "Pika",
        description: "Générateur vidéo IA créatif.",
        info: "Pika permet de créer des animations et clips stylisés à partir d’entrées textuelles ou visuelles. Idéal pour les créateurs de contenu courts.",
        lien: "https://pika.art",
        type: "video",
        categories: ["generation"]
    },
    {
        nom: "Sora",
        description: "Générateur vidéo IA par OpenAI.",
        info: "Sora est un projet ambitieux pour générer des vidéos photoréalistes à partir de prompts textuels complexes, destiné à la production audiovisuelle avancée.",
        lien: "https://openai.com/sora",
        type: "video",
        categories: ["generation"]
    },
    {
        nom: "Luma AI",
        description: "Création IA d'environnements 3D.",
        info: "Luma AI permet de transformer des photos ou vidéos en objets ou scènes 3D, utile pour les jeux, la réalité augmentée et la visualisation produit.",
        lien: "https://lumalabs.ai",
        type: "video",
        categories: ["generation"]
    },
    {
        nom: "Kling AI",
        description: "Vidéo réaliste à partir de texte.",
        info: "Kling AI génère des vidéos très réalistes de personnages ou scènes, en mettant l'accent sur le mouvement et le rendu fidèle.",
        lien: "https://kling.ai",
        type: "video",
        categories: ["generation"]
    },
    {
        nom: "Genny by Lovo",
        description: "Générateur de voix IA réaliste.",
        info: "Genny permet de créer des voix humaines naturelles à partir de texte, utilisées pour les vidéos, podcasts ou jeux vidéo.",
        lien: "https://lovo.ai",
        type: "audio",
        categories: ["voice"]
    },
    {
        nom: "ElevenLabs",
        description: "Synthèse vocale IA avancée.",
        info: "ElevenLabs offre des outils de synthèse vocale de haute qualité avec personnalisation de ton, langue, et émotion.",
        lien: "https://elevenlabs.io",
        type: "audio",
        categories: ["voice"]
    },
    {
        nom: "Murf",
        description: "Voix off IA.",
        info: "Murf propose des voix off professionnelles IA adaptées à l’e-learning, aux vidéos explicatives ou au marketing.",
        lien: "https://murf.ai",
        type: "audio",
        categories: ["voice"]
    },
    {
        nom: "Voicemaker",
        description: "Voix IA personnalisables.",
        info: "Voicemaker permet de générer des voix uniques en ajustant rythme, ton, langue et effet sonore.",
        lien: "https://voicemaker.in",
        type: "audio",
        categories: ["voice"]
    },
    {
        nom: "Suno.ai",
        description: "Création musicale IA.",
        info: "Suno permet de composer automatiquement des chansons avec paroles et musique, à partir de prompts simples.",
        lien: "https://suno.ai",
        type: "audio",
        categories: ["music"]
    },
    {
        nom: "MusicFX",
        description: "Générateur IA de loops musicaux.",
        info: "MusicFX, développé par Google, crée des boucles musicales originales et variées avec des algorithmes IA accessibles en ligne.",
        lien: "https://googlecreativelab.github.io/musicfx/",
        type: "audio",
        categories: ["music"]
    },
    {
        nom: "Boomy",
        description: "Crée des morceaux avec IA.",
        info: "Boomy génère des chansons entières que les utilisateurs peuvent personnaliser et publier, avec droits d’auteur simplifiés.",
        lien: "https://boomy.com",
        type: "audio",
        categories: ["music"]
    },
    {
        nom: "Riffusion",
        description: "Musique générée par spectrogrammes.",
        info: "Riffusion exploite des images de spectres audio pour créer de la musique originale de façon innovante et visuelle.",
        lien: "https://riffusion.com",
        type: "audio",
        categories: ["music"]
    },
    {
        nom: "Jules",
        description: "Aide au code IA pour les étudiants.",
        info: "Jules est un assistant d’apprentissage IA français conçu pour soutenir les élèves dans la compréhension du code et des algorithmes.",
        lien: "https://jules.education.gouv.fr",
        type: "texte",
        categories: ["code"]
    },
    {
        nom: "Devstral",
        description: "Génération IA de code.",
        info: "Devstral permet de créer des scripts ou blocs de code complets à partir d’objectifs décrits en langage naturel.",
        lien: "https://devstral.com",
        type: "texte",
        categories: ["code"]
    },
    {
        nom: "Codeium",
        description: "Complétion de code open source.",
        info: "Codeium fournit une autocomplétion IA pour de nombreux langages de programmation, avec intégration dans des IDE populaires.",
        lien: "https://codeium.com",
        type: "texte",
        categories: ["code"]
    },
    {
        nom: "Bolt",
        description: "Générateur de code instantané.",
        info: "Bolt aide à créer des projets web rapidement via une interface IA sans code ou avec code personnalisé.",
        lien: "https://boltai.io",
        type: "texte",
        categories: ["code"]
    }
];

// Définition des fonctions formatTooltipText, renderToolsWithTooltips, et applyFilters
function formatTooltipText(texte) {
    const champs = [
        { label: "Date", regex: /Date\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Contexte", regex: /Contexte\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Cible", regex: /Cible\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Ton", regex: /Ton\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Livrables", regex: /Livrables\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Contraintes", regex: /Contraintes\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
        { label: "Canaux", regex: /Canaux\s*:\s*(.+?)(?=\s+[A-ZÉ]|$)/i },
    ];

    // Utilisation de la propriété 'info' pour le résumé initial
    // Si 'info' n'est pas une phrase complète, considérez simplement la première partie
    let summaryText = texte.split("Date")[0].trim();
    if (summaryText === '') { // Fallback au cas où 'info' est très court ou manquant avant 'Date'
        summaryText = "Informations non structurées disponibles.";
    }

    let html = `<div class="tooltip-section"><span class="tooltip-label">Résumé :</span> ${summaryText}</div>`;

    champs.forEach(({ label, regex }) => {
        const match = texte.match(regex);
        if (match && match[1].trim() !== '') { // Assurez-vous qu'il y a du contenu après le label
            html += `<div class="tooltip-section"><span class="tooltip-label">${label} :</span> ${match[1].trim()}</div>`;
        }
    });

    return html;
}

function renderToolsWithTooltips(filteredTools) {
    const grid = document.getElementById("tools-grid");
    grid.innerHTML = "";

    if (!filteredTools || filteredTools.length === 0) {
        grid.innerHTML = "<p style='text-align: center; color: #555;'>Aucun outil trouvé avec ces critères.</p>";
        return;
    }

    filteredTools.forEach(tool => {
        const card = document.createElement("div");
        card.className = "card";

        // ******************************************************
        // MODIFICATION CLÉ ICI : AJOUT DE LA CLASSE DE TYPE
        if (tool.type) {
            card.classList.add(`type-${tool.type}`);
        }
        // ******************************************************

        const longInfo = tool.info && tool.info.trim() !== '' && tool.info !== tool.description
            ? tool.info
            : tool.description + ' (Plus d\'informations prochainement disponibles.)';

        // Maintenant que la classe est ajoutée à 'card',
        // le innerHTML peut être utilisé pour le contenu
        card.innerHTML = `
            <div class="tooltip">${formatTooltipText(longInfo)}</div>
            <h2>${tool.nom}</h2>
            <div class="description">${tool.description}</div>
            <div class="meta">${tool.type} • ${tool.categories.join(", ")}</div>
            <button onclick="window.open('${tool.lien}', '_blank')">Lancer ${tool.nom}</button>
        `;
        grid.appendChild(card);
    });
}

function applyFilters() {
    const search = document.getElementById("search").value.toLowerCase();
    const type = document.getElementById("filtre-type").value; // Pas besoin de .toLowerCase() ici car les values des options correspondent

    const filtered = tools.filter(tool => {
        const matchSearch =
            tool.nom.toLowerCase().includes(search) ||
            tool.description.toLowerCase().includes(search) ||
            (tool.info && tool.info.toLowerCase().includes(search)) ||
            tool.categories.some(cat => cat.toLowerCase().includes(search));
            
        // Pour le type, on compare directement la valeur de l'outil avec la valeur du filtre
        const matchType = !type || tool.type === type; 
        return matchSearch && matchType;
    });

    renderToolsWithTooltips(filtered);
}
