// tools-full.js

// Définition du tableau 'tools' avec toutes vos données d'outils
const tools = [
    {
        nom: "ChatGPT",
        description: "Assistant conversationnel basé sur GPT-4.",
        info: "ChatGPT est utilisé pour simuler des conversations humaines, répondre à des questions, rédiger des textes et automatiser des tâches grâce à la puissance du modèle GPT-4 d'OpenAI.",
        lien: "https://chat.openai.com",
        type: "texte", // Assurez-vous que tous les outils ont bien cette propriété 'type'
        categories: ["redaction", "resume"],
        teams: ["CRM", "Com. Externe & Influenceurs"],
        rtbf: true // La propriété est maintenant 'rtbf'
    },
    {
        nom: "Claude",
        description: "Assistant IA développé par Anthropic.",
        info: "Claude se distingue par une approche axée sur la sécurité et l'alignement éthique des modèles IA, idéal pour les entreprises sensibles à la responsabilité numérique.",
        lien: "https://claude.ai",
        type: "texte",
        categories: ["redaction", "resume"],
        teams: ["CRM"],
        rtbf: true // Mis à true pour Claude selon votre demande implicite de validation
    },
    {
        nom: "Midjourney",
        description: "Générateur d’images créatives via Discord.",
        info: "Midjourney permet aux utilisateurs de générer des images artistiques à partir de descriptions textuelles, souvent utilisées pour des projets visuels ou créatifs.",
        lien: "https://midjourney.com",
        type: "image",
        categories: ["generation"],
        teams: ["Com. Externe & Influenceurs"],
        rtbf: false // Exemple: non validé
    },
    {
        nom: "DALL·E",
        description: "Générateur d’images à partir de texte par OpenAI.",
        info: "DALL·E est idéal pour créer des visuels réalistes ou artistiques à partir de descriptions détaillées, utilisé dans la publicité ou la scénarisation.",
        lien: "https://openai.com/dall-e",
        type: "image",
        categories: ["generation"],
        teams: ["Com. Externe & Influenceurs"],
        rtbf: false // Exemple: non validé
    },
    {
        nom: "Stable Diffusion",
        description: "Modèle open source de génération d'images.",
        info: "Stable Diffusion permet aux utilisateurs de créer localement des images avec un haut niveau de personnalisation, utile pour les développeurs et créatifs.",
        lien: "https://stability.ai",
        type: "image",
        categories: ["generation"],
        teams: ["Marketing Digital"],
        rtbf: false // Exemple: non validé
    },
    {
        nom: "Firefly",
        description: "Suite d'outils IA d'Adobe pour les créateurs.",
        info: "Firefly intègre la génération d’images, de texte stylisé et d’animations directement dans les outils Adobe, favorisant la productivity créative.",
        lien: "https://firefly.adobe.com",
        type: "image",
        categories: ["generation"],
        teams: ["Pôle créa."],
        rtbf: true // Mis à true pour Firefly
    },
    {
        nom: "Runway ML",
        description: "Outils de création vidéo IA.",
        info: "Runway ML propose des fonctionnalités avancées pour l’édition vidéo, la génération de contenus animés et le compositing via l’IA, très prisé dans les domaines du cinéma et du marketing.",
        lien: "https://runwayml.com",
        type: "video",
        categories: ["generation", "montage"],
        teams: ["Marketing Digital"],
        rtbf: true // Mis à true pour Runway ML
    },
    {
        nom: "Perplexity",
        description: "Moteur de recherche conversationnel IA.",
        info: "Perplexity combine recherche web et intelligence conversationnelle pour fournir des réponses précises et documentées, utile pour les professionnels de la veille.",
        lien: "https://perplexity.ai",
        type: "texte",
        categories: ["resume"],
        teams: ["CRM"],
        rtbf: false
    },
    {
        nom: "Notion AI",
        description: "Fonctionnalités IA intégrées à Notion.",
        info: "Notion AI permet de générer du contenu structuré, faire des résumés automatiques, et améliorer l’organisation des connaissances au sein des notes collaboratives.",
        lien: "https://www.notion.so/product/ai",
        type: "texte",
        categories: ["redaction"],
        rtbf: false
    },
    {
        nom: "Gemini",
        description: "Assistant multimodal Google.",
        info: "Gemini combine texte, image, audio et vidéo dans un même environnement d’interaction, facilitant les tâches complexes pour les utilisateurs professionnels.",
        lien: "https://gemini.google.com",
        type: "texte",
        categories: ["redaction", "resume"],
        rtbf: true // Mis à true pour Gemini
    },
    {
        nom: "Copilot",
        description: "Outils IA de GitHub ou Microsoft selon contexte.",
        info: "Copilot assiste les développeurs en générant automatiquement des lignes de code ou en proposant des complétions intelligentes dans les éditeurs comme VSCode.",
        lien: "https://copilot.microsoft.com",
        type: "texte",
        categories: ["code"],
        rtbf: false
    },
    {
        nom: "Bard",
        description: "Assistant IA de Google (prédécesseur de Gemini).",
        info: "Bard était conçu pour interagir de façon conversationnelle en s'appuyant sur les données du web, souvent utilisé comme outil de recherche augmentée.",
        lien: "https://bard.google.com",
        type: "texte",
        categories: ["redaction"],
        rtbf: false
    },
    {
        nom: "Pika",
        description: "Générateur vidéo IA créatif.",
        info: "Pika permet de créer des animations et clips stylisés à partir d’entrées textuelles ou visuelles. Idéal pour les créateurs de contenu courts.",
        lien: "https://pika.art",
        type: "video",
        categories: ["generation"],
        rtbf: false
    },
    {
        nom: "Sora",
        description: "Générateur vidéo IA par OpenAI.",
        info: "Sora est un projet ambitieux pour générer des vidéos photoréalistes à partir de prompts textuels complexes, destiné à la production audiovisuelle avancée.",
        lien: "https://openai.com/sora",
        type: "video",
        categories: ["generation"],
        rtbf: false
    },
    {
        nom: "Luma AI",
        description: "Création IA d'environnements 3D.",
        info: "Luma AI permet de transformer des photos ou vidéos en objets ou scènes 3D, utile pour les jeux, la réalité augmentée et la visualisation produit.",
        lien: "https://lumalabs.ai",
        type: "video",
        categories: ["generation"],
        rtbf: false
    },
    {
        nom: "Kling AI",
        description: "Vidéo réaliste à partir de texte.",
        info: "Kling AI génère des vidéos très réalistes de personnages ou scènes, en mettant l'accent sur le mouvement et le rendu fidèle.",
        lien: "https://kling.ai",
        type: "video",
        categories: ["generation"],
        rtbf: false
    },
    {
        nom: "Genny by Lovo",
        description: "Générateur de voix IA réaliste.",
        info: "Genny permet de créer des voix humaines naturelles à partir de texte, utilisées pour les vidéos, podcasts ou jeux vidéo.",
        lien: "https://lovo.ai",
        type: "audio",
        categories: ["voice"],
        rtbf: false
    },
    {
        nom: "ElevenLabs",
        description: "Synthèse vocale IA avancée.",
        info: "ElevenLabs offre des outils de synthèse vocale de haute qualité avec personnalisation de ton, langue, et émotion.",
        lien: "https://elevenlabs.io",
        type: "audio",
        categories: ["voice"],
        rtbf: false
    },
    {
        nom: "Murf",
        description: "Voix off IA.",
        info: "Murf propose des voix off professionnelles IA adaptées à l’e-learning, aux vidéos explicatives ou au marketing.",
        lien: "https://murf.ai",
        type: "audio",
        categories: ["voice"],
        rtbf: false
    },
    {
        nom: "Voicemaker",
        description: "Voix IA personnalisables.",
        info: "Voicemaker permet de générer des voix uniques en ajustant rythme, ton, langue et effet sonore.",
        lien: "https://voicemaker.in",
        type: "audio",
        categories: ["voice"],
        rtbf: false
    },
    {
        nom: "Suno.ai",
        description: "Création musicale IA.",
        info: "Suno permet de composer automatiquement des chansons avec paroles et musique, à partir de prompts simples.",
        lien: "https://suno.ai",
        type: "audio",
        categories: ["music"],
        rtbf: false
    },
    {
        nom: "MusicFX",
        description: "Générateur IA de loops musicaux.",
        info: "MusicFX, développé par Google, crée des boucles musicales originales et variées avec des algorithmes IA accessibles en ligne.",
        lien: "https://googlecreativelab.github.io/musicfx/",
        type: "audio",
        categories: ["music"],
        rtbf: false
    },
    {
        nom: "Boomy",
        description: "Crée des morceaux avec IA.",
        info: "Boomy génère des chansons entières que les utilisateurs peuvent personnaliser et publier, avec droits d’auteur simplifiés.",
        lien: "https://boomy.com",
        type: "audio",
        categories: ["music"],
        rtbf: false
    },
    {
        nom: "Riffusion",
        description: "Musique générée par spectrogrammes.",
        info: "Riffusion exploite des images de spectres audio pour créer de la musique originale de façon innovante et visuelle.",
        lien: "https://riffusion.com",
        type: "audio",
        categories: ["music"],
        rtbf: false
    },
    {
        nom: "Jules",
        description: "Aide au code IA pour les étudiants.",
        info: "Jules est un assistant d’apprentissage IA français conçu pour soutenir les élèves dans la compréhension du code et des algorithmes.",
        lien: "https://jules.education.gouv.fr",
        type: "texte",
        categories: ["code"],
        rtbf: false
    },
    {
        nom: "Devstral",
        description: "Génération IA de code.",
        info: "Devstral permet de créer des scripts ou blocs de code complets à partir d’objectifs décrits en langage naturel.",
        lien: "https://devstral.com",
        type: "texte",
        categories: ["code"],
        rtbf: false
    },
    {
        nom: "Codeium",
        description: "Complétion de code open source.",
        info: "Codeium fournit une autocomplétion IA pour de nombreux langages de programmation, avec intégration dans des IDE populaires.",
        lien: "https://codeium.com",
        type: "texte",
        categories: ["code"],
        rtbf: false
    },
    {
        nom: "Bolt",
        description: "Générateur de code instantané.",
        info: "Bolt aide à créer des projets web rapidement via une interface IA sans code ou avec code personnalisé.",
        lien: "https://boltai.io",
        type: "texte",
        categories: ["code"],
        rtbf: false
    }
];

// Définition des fonctions formatTooltipText, renderToolsWithTooltips, et applyFilters
function formatTooltipText(infoText) {
    // Dans votre nouvelle structure, 'info' est une chaîne de texte simple.
    // Nous allons l'afficher directement, ou y ajouter un message par défaut si elle est vide.
    return `<div class="tooltip-section"><span class="tooltip-label">Détails :</span> ${infoText || "Aucune information détaillée disponible pour cet outil."}</div>`;
}

function renderToolsWithTooltips(filteredTools) {
    const grid = document.getElementById("tools-grid");
    grid.innerHTML = ""; // Vide la grille avant de la remplir

    if (!filteredTools || filteredTools.length === 0) {
        grid.innerHTML = "<p style='text-align: center; color: #555;'>Aucun outil trouvé avec ces critères.</p>";
        return;
    }

    filteredTools.forEach(tool => {
        const card = document.createElement("div");
        card.classList.add("card"); // Ajoute la classe de base 'card'

        // Ajout de la classe de type
        if (tool.type) {
            card.classList.add(`type-${tool.type}`);
        }

        // Ajout du badge de validation si rtbf est vrai
        if (tool.rtbf) {
            const validationBadge = document.createElement("div");
            validationBadge.classList.add("validation-badge");
            validationBadge.textContent = "V";
            card.appendChild(validationBadge);
        }

        // Construction du contenu de la carte élément par élément
        const longInfo = tool.info && tool.info.trim() !== '' ? tool.info : tool.description;

        // Tooltip
        const tooltip = document.createElement("div");
        tooltip.classList.add("tooltip");
        tooltip.innerHTML = formatTooltipText(longInfo);
        card.appendChild(tooltip);

        // Titre
        const h2 = document.createElement("h2");
        h2.textContent = tool.nom;
        card.appendChild(h2);

        // Description
        const description = document.createElement("p"); // Changed from div to p for semantic correctness
        description.classList.add("description");
        description.textContent = tool.description;
        card.appendChild(description);

        // Méta (type + catégories)
        const meta = document.createElement("div");
        meta.classList.add("meta");
        const categoriesDisplay = tool.categories && tool.categories.length > 0
            ? tool.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(", ")
            : "N/A";
        meta.innerHTML = `${tool.type ? tool.type.charAt(0).toUpperCase() + tool.type.slice(1) : 'N/A'} • ${categoriesDisplay}`;
        card.appendChild(meta);

        // Bouton
        const button = document.createElement("button");
        button.textContent = `Lancer ${tool.nom}`;
        button.onclick = () => window.open(tool.lien, '_blank');
        card.appendChild(button);

        // Ajoute la carte complète à la grille
        grid.appendChild(card);
    });
}

function applyFilters() {
    const search = document.getElementById("search").value.toLowerCase();
    const selectedType = document.getElementById("filtre-type").value; // 'selectedType' for clarity
    const selectedRTBF = document.getElementById("filtre-rtbf").value; // 'valide' or ''

    const filtered = tools.filter(tool => {
        const matchSearch =
            tool.nom.toLowerCase().includes(search) ||
            tool.description.toLowerCase().includes(search) ||
            (tool.info && tool.info.toLowerCase().includes(search)) ||
            (tool.categories && tool.categories.some(cat => cat.toLowerCase().includes(search))); // Check if categories exist

        const matchType = !selectedType || tool.type === selectedType; // Use selectedType

        // Logique de filtrage RTBF
        const matchRTBF = (selectedRTBF === "" || (selectedRTBF === "valide" && tool.rtbf === true));

        return matchSearch && matchType && matchRTBF;
    });

    renderToolsWithTooltips(filtered);
}
