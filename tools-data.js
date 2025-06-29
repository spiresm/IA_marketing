// tools-data.js

// Cette liste est la source de vérité pour tous les outils utilisés dans l'application.
// Les noms doivent correspondre exactement si vous voulez filtrer par eux.
// Assurez-vous que les chemins d'image sont corrects (par exemple, "images/logo_chatgpt.png" si vos logos sont dans un dossier 'images').
const toolsData = [
    { 
        name: "Premiere Pro", 
        img: "images/logo_premiere.png", // Chemin corrigé (ajustez si votre dossier d'images est différent)
        type: ["video", "audio"], // Types de contenu gérés par l'outil
        description: "Logiciel de montage vidéo professionnel d'Adobe, leader de l'industrie pour la production de contenu vidéo.",
        validated: true, // Statut de validation par la RTBF (exemple)
        url: "https://www.adobe.com/fr/products/premiere.html" // Lien officiel de l'outil
    },
    { 
        name: "n8n", 
        img: "images/logo_n8n.png", 
        type: ["automatisation", "intégration"], 
        description: "Un outil open-source d'automatisation de flux de travail qui connecte des applications et des services via une interface visuelle.",
        validated: false, 
        url: "https://n8n.io/"
    },
    { 
        name: "Runway ML", 
        img: "images/logo_runwayML.png", 
        type: ["video", "image", "generative-ai"], 
        description: "Suite d'outils d'IA créatifs, offrant des fonctionnalités de génération et d'édition pour la vidéo et l'image, comme la conversion texte-vidéo.",
        validated: true, 
        url: "https://runwayml.com/"
    },
    { 
        name: "Midjourney", 
        img: "images/logo_midjourney.png", 
        type: ["image", "generative-ai"], 
        description: "Un programme d'intelligence artificielle qui génère des images uniques et de haute qualité à partir de descriptions textuelles.",
        validated: true, 
        url: "https://www.midjourney.com/"
    },
    { 
        name: "Stable Diffusion", 
        img: "images/logo_stable_diff.png", 
        type: ["image", "generative-ai"], 
        description: "Un modèle open-source populaire pour la génération d'images text-to-image, offrant une grande flexibilité et personnalisation.",
        validated: false, 
        url: "https://stability.ai/stable-diffusion"
    },
    { 
        name: "ChatGPT", 
        img: "images/logo_chatgpt.png", 
        type: ["texte", "generative-ai", "coding"], 
        description: "Le célèbre modèle de langage d'OpenAI capable de comprendre et de générer du texte cohérent pour de nombreuses tâches.",
        validated: true, 
        url: "https://openai.com/chatgpt/"
    },
    { 
        name: "DALL-E", 
        img: "images/logo_dall_E.png", 
        type: ["image", "generative-ai"], 
        description: "Un autre modèle d'OpenAI spécialisé dans la création d'images innovantes à partir de descriptions textuelles.",
        validated: true, 
        url: "https://openai.com/dall-e-3/"
    },
    { 
        name: "Claude", 
        img: "images/logo_claude.png", 
        type: ["texte", "generative-ai"], 
        description: "Un assistant IA conversationnel développé par Anthropic, connu pour sa sécurité, son éthique et sa capacité à traiter de longs textes.",
        validated: false, 
        url: "https://claude.ai/"
    },
    { 
        name: "Adobe Firefly", 
        img: "images/logo_firefly.png", 
        type: ["image", "texte", "generative-ai"], 
        description: "La famille de modèles d'IA générative d'Adobe, intégrée à leurs outils créatifs pour faciliter la création de contenu.",
        validated: true, 
        url: "https://www.adobe.com/sensei/generative-ai/firefly.html"
    },
    { 
        name: "ElevenLabs", 
        img: "images/logo_elevenlabs.png", 
        type: ["audio", "texte", "voice-synthesis"], 
        description: "Plateforme leader dans la synthèse vocale basée sur l'IA, offrant des voix réalistes et le clonage de voix.",
        validated: true, 
        url: "https://elevenlabs.io/"
    },
    { 
        name: "Photoshop", 
        img: "images/logo_photoshop.png", 
        type: ["image", "design"], 
        description: "Logiciel de retouche d'image et de conception graphique incontournable, désormais enrichi de puissantes fonctionnalités IA.",
        validated: true, 
        url: "https://www.adobe.com/fr/products/photoshop.html"
    },
    // Ajoutez ici d'autres outils avec leurs propriétés complètes pour une meilleure fonctionnalité sur outils.html
    { 
        name: "Adobe Illustrator", 
        img: "images/logo_illustrator.png", // Exemple: assurez-vous d'avoir ce fichier logo
        type: ["image", "design"], 
        description: "Logiciel de référence pour la création graphique vectorielle, idéal pour les logos et les illustrations.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/illustrator.html"
    },
    { 
        name: "Adobe After Effects", 
        img: "images/logo_after_effects.png", // Exemple
        type: ["video", "animation"], 
        description: "Outil professionnel pour les effets visuels, les animations graphiques et la composition vidéo.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/aftereffects.html"
    },
    { 
        name: "Canva AI", 
        img: "images/logo_canva.png", // Exemple
        type: ["image", "texte", "design"], 
        description: "Intègre l'IA pour simplifier la création de designs graphiques, des présentations aux posts pour les réseaux sociaux.",
        validated: false, 
        url: "https://www.canva.com/fr_fr/fonctionnalites/magic-studio/"
    }
];
