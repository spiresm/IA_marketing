// tools-data.js

// Cette liste est la source de vérité pour tous les outils utilisés dans l'application.
// Les noms doivent correspondre exactement si vous voulez filtrer par eux.
// Les chemins d'images ont été ajustés pour des logos à la racine du projet.
const toolsData = [
    { 
        name: "Premiere Pro", 
        img: "logo_premiere.png", // Chemin corrigé : plus de "images/"
        type: ["video", "audio"], 
        description: "Logiciel de montage vidéo professionnel d'Adobe, leader de l'industrie pour la production de contenu vidéo.",
        validated: true, 
        url: "https://www.adobe.com/fr/products/premiere.html"
    },
    { 
        name: "n8n", 
        img: "logo_n8n.png", // Chemin corrigé
        type: ["automatisation", "intégration"], 
        description: "Un outil open-source d'automatisation de flux de travail qui connecte des applications et des services via une interface visuelle.",
        validated: false, 
        url: "https://n8n.io/"
    },
    { 
        name: "Runway ML", 
        img: "logo_runwayML.png", // Chemin corrigé
        type: ["video", "image", "generative-ai"], 
        description: "Suite d'outils d'IA créatifs, offrant des fonctionnalités de génération et d'édition pour la vidéo et l'image, comme la conversion texte-vidéo.",
        validated: true, 
        url: "https://runwayml.com/"
    },
    { 
        name: "Midjourney", 
        img: "logo_midjourney.png", // Chemin corrigé
        type: ["image", "generative-ai"], 
        description: "Un programme d'intelligence artificielle qui génère des images uniques et de haute qualité à partir de descriptions textuelles.",
        validated: true, 
        url: "https://www.midjourney.com/"
    },
    { 
        name: "Stable Diffusion", 
        img: "logo_stable_diff.png", // Chemin corrigé
        type: ["image", "generative-ai"], 
        description: "Un modèle open-source populaire pour la génération d'images text-to-image, offrant une grande flexibilité et personnalisation.",
        validated: false, 
        url: "https://stability.ai/stable-diffusion"
    },
    { 
        name: "ChatGPT", 
        img: "logo_chatgpt.png", // Chemin corrigé
        type: ["texte", "generative-ai", "coding"], 
        description: "Le célèbre modèle de langage d'OpenAI capable de comprendre et de générer du texte cohérent pour de nombreuses tâches.",
        validated: true, 
        url: "https://openai.com/chatgpt/"
    },
    { 
        name: "DALL-E", 
        img: "logo_dall_E.png", // Chemin corrigé
        type: ["image", "generative-ai"], 
        description: "Un autre modèle d'OpenAI spécialisé dans la création d'images innovantes à partir de descriptions textuelles.",
        validated: true, 
        url: "https://openai.com/dall-e-3/"
    },
    { 
        name: "Claude", 
        img: "logo_claude.png", // Chemin corrigé
        type: ["texte", "generative-ai"], 
        description: "Un assistant IA conversationnel développé par Anthropic, connu pour sa sécurité, son éthique et sa capacité à traiter de longs textes.",
        validated: false, 
        url: "https://claude.ai/"
    },
    { 
        name: "Adobe Firefly", 
        img: "logo_firefly.png", // Chemin corrigé
        type: ["image", "texte", "generative-ai"], 
        description: "La famille de modèles d'IA générative d'Adobe, intégrée à leurs outils créatifs pour faciliter la création de contenu.",
        validated: true, 
        url: "https://www.adobe.com/sensei/generative-ai/firefly.html"
    },
    { 
        name: "ElevenLabs", 
        img: "logo_elevenlabs.png", // Chemin corrigé
        type: ["audio", "texte", "voice-synthesis"], 
        description: "Plateforme leader dans la synthèse vocale basée sur l'IA, offrant des voix réalistes et le clonage de voix.",
        validated: true, 
        url: "https://elevenlabs.io/"
    },
    { 
        name: "Photoshop", 
        img: "logo_photoshop.png", // Chemin corrigé
        type: ["image", "design"], 
        description: "Logiciel de retouche d'image et de conception graphique incontournable, désormais enrichi de puissantes fonctionnalités IA.",
        validated: true, 
        url: "https://www.adobe.com/fr/products/photoshop.html"
    },
    // Si ces logos existent à la racine, adaptez leurs chemins aussi
    { 
        name: "Adobe Illustrator", 
        img: "logo_illustrator.png", // Chemin corrigé
        type: ["image", "design"], 
        description: "Logiciel de référence pour la création graphique vectorielle, idéal pour les logos et les illustrations.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/illustrator.html"
    },
    { 
        name: "Adobe After Effects", 
        img: "logo_after_effects.png", // Chemin corrigé
        type: ["video", "animation"], 
        description: "Outil professionnel pour les effets visuels, les animations graphiques et la composition vidéo.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/aftereffects.html"
    },
    { 
        name: "Canva AI", 
        img: "logo_canva.png", // Chemin corrigé
        type: ["image", "texte", "design"], 
        description: "Intègre l'IA pour simplifier la création de designs graphiques, des présentations aux posts pour les réseaux sociaux.",
        validated: false, 
        url: "https://www.canva.com/fr_fr/fonctionnalites/magic-studio/"
    }
];
