// tools-data.js

const toolsData = [
    { 
        name: "Premiere Pro", 
        img: "logo_premiere.png", 
        type: ["video", "audio", "montage"], 
        description: "Logiciel de montage vidéo professionnel d'Adobe, leader de l'industrie pour la production de contenu vidéo.",
        validated: true, 
        url: "https://www.adobe.com/fr/products/premiere.html",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Adobe Premiere Pro est l'outil de montage vidéo de référence pour les professionnels. Il offre une suite complète de fonctionnalités pour l'édition, les effets, les graphiques et l'intégration audio, avec des performances optimisées pour les flux de travail exigeants. Idéal pour les publicités, les documentaires, les courts-métrages, les films et le contenu en ligne de haute qualité. Il est constamment mis à jour avec de nouvelles fonctionnalités basées sur l'IA pour améliorer l'efficacité du montage.",
            links: [
                { name: "Page officielle Adobe Premiere Pro", url: "https://www.adobe.com/fr/products/premiere.html" },
                { name: "Tutoriels officiels", url: "https://helpx.adobe.com/fr/premiere-pro/tutorials.html" },
                { name: "Fonctionnalités IA de Premiere Pro", url: "https://www.adobe.com/fr/products/premiere/features.html#ai-powered-features" }
            ]
        }
    },
    { 
        name: "n8n", 
        img: "logo_n8n.png", 
        type: ["automatisation", "intégration", "workflow"], 
        description: "Un outil open-source d'automatisation de flux de travail qui connecte des applications et des services via une interface visuelle.",
        validated: false, 
        url: "https://n8n.io/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "n8n est une plateforme d'automatisation de workflow open-source et extensible, conçue pour connecter n'importe quelle application dotée d'une API. Elle permet de créer des flux de travail complexes et personnalisés pour automatiser des tâches répétitives, synchroniser des données entre différentes plateformes et améliorer l'efficacité opérationnelle. Idéal pour les développeurs et les utilisateurs avancés qui ont besoin de flexibilité.",
            links: [
                { name: "Site officiel n8n", url: "https://n8n.io/" },
                { name: "Documentation n8n", url: "https://docs.n8n.io/" },
                { name: "Communauté n8n (Forum)", url: "https://community.n8n.io/" },
                { name: "Découvrir des workflows", url: "https://n8n.io/workflows/" }
            ]
        }
    },
    { 
        name: "Runway ML", 
        img: "logo_runwayML.png", 
        type: ["video", "image", "generative-ai", "creative"], 
        description: "Suite d'outils d'IA créatifs, notamment pour la génération et l'édition vidéo et image.",
        validated: true, 
        url: "https://runwayml.com/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Runway ML est à la pointe de la création de contenu assistée par l'IA. Cette plateforme offre une suite complète d'outils pour transformer le texte en vidéo (Gen-2), la vidéo en vidéo (Gen-1), le texte en image, et bien plus. Elle inclut également des fonctionnalités d'édition magiques comme la suppression d'objets ou le remplacement du fond en quelques clics, rendant la production vidéo de haute qualité accessible.",
            links: [
                { name: "Site officiel Runway ML", url: "https://runwayml.com/" },
                { name: "Galerie de créations (Showcase)", url: "https://runwayml.com/showcase/" },
                { name: "Demos et tutoriels", url: "https://www.youtube.com/@RunwayML" } // Exemple de chaîne YouTube
            ]
        }
    },
    { 
        name: "Midjourney", 
        img: "logo_midjourney.png", 
        type: ["image", "generative-ai", "art"], 
        description: "Un programme d'IA qui génère des images à partir de descriptions textuelles via Discord.",
        validated: true, 
        url: "https://www.midjourney.com/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Midjourney est l'un des outils de génération d'images par IA les plus renommés, produisant des visuels d'une qualité artistique exceptionnelle à partir de simples descriptions textuelles (prompts). Il est principalement accessible via une interface sur Discord, où les utilisateurs peuvent interagir avec le bot pour affiner leurs créations. C'est un outil puissant pour les artistes, illustrateurs et créatifs qui cherchent à explorer de nouvelles formes d'expression visuelle.",
            links: [
                { name: "Site officiel Midjourney", url: "https://www.midjourney.com/" },
                { name: "Guide utilisateur officiel", url: "https://docs.midjourney.com/" },
                { name: "Galerie de la communauté", url: "https://www.midjourney.com/showcase/" },
                { name: "Serveur Discord", url: "https://discord.com/invite/midjourney" }
            ]
        }
    },
    { 
        name: "Stable Diffusion", 
        img: "logo_stable_diff.png", 
        type: ["image", "generative-ai", "open-source", "customisation"], 
        description: "Un modèle open-source de génération d'images text-to-image.",
        validated: false, 
        url: "https://stability.ai/stable-diffusion",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Stable Diffusion est un modèle de génération d'images open-source qui permet de créer des images photoréalistes ou stylisées à partir de texte. Sa flexibilité et sa licence permissive ont permis une explosion d'applications tierces et de modèles affinés, donnant aux utilisateurs un contrôle inégalé sur le processus de création. Il est particulièrement apprécié pour sa communauté active et la personnalisation poussée qu'il offre.",
            links: [
                { name: "Page officielle Stability AI", url: "https://stability.ai/stable-diffusion" },
                { name: "Dépôt GitHub", url: "https://github.com/Stability-AI/StableDiffusion" },
                { name: "Exemples de démos", url: "https://huggingface.co/stabilityai" } // Liens vers des démos courantes
            ]
        }
    },
    { 
        name: "ChatGPT", 
        img: "logo_chatgpt.png", 
        type: ["texte", "generative-ai", "conversationnel", "codage"], 
        description: "Le célèbre modèle de langage d'OpenAI capable de comprendre et de générer du texte cohérent pour de nombreuses tâches.",
        validated: true, 
        url: "https://openai.com/chatgpt/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "ChatGPT est un grand modèle de langage (LLM) développé par OpenAI, capable de comprendre et de générer du texte de manière naturelle et cohérente. Il peut assister dans la rédaction, la traduction, le résumé, le brainstorming d'idées, la programmation et les interactions conversationnelles complexes. Sa polyvalence en fait un outil essentiel pour la productivité et la créativité basée sur le texte.",
            links: [
                { name: "Site officiel ChatGPT", url: "https://openai.com/chatgpt/" },
                { name: "API documentation (Platform OpenAI)", url: "https://platform.openai.com/docs/models/chatgpt" },
                { name: "Blog OpenAI (Mises à jour et recherches)", url: "https://openai.com/blog/" }
            ]
        }
    },
    { 
        name: "DALL-E", 
        img: "logo_dall_E.png", 
        type: ["image", "generative-ai", "art"], 
        description: "Un autre modèle d'OpenAI spécialisé dans la création d'images innovantes à partir de descriptions textuelles.",
        validated: true, 
        url: "https://openai.com/dall-e-3/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "DALL-E, également d'OpenAI, est un puissant système d'IA capable de générer des images réalistes et artistiques à partir de descriptions textuelles détaillées. Il excelle dans la création de concepts visuels uniques, la combinaison d'éléments inattendus et l'application de styles artistiques variés. La version DALL-E 3, notamment, offre une meilleure compréhension des prompts et une intégration facilitée dans ChatGPT Plus.",
            links: [
                { name: "Page officielle DALL-E 3", url: "https://openai.com/dall-e-3/" },
                { name: "Galerie d'exemples DALL-E", url: "https://openai.com/dall-e" }, 
                { name: "Utilisation via ChatGPT Plus", url: "https://chatgpt.com/" }
            ]
        }
    },
    { 
        name: "Claude", 
        img: "logo_claude.png", 
        type: ["texte", "generative-ai", "conversationnel", "sécurité", "éthique"], 
        description: "Un assistant IA conversationnel développé par Anthropic, connu pour sa sécurité, son éthique et sa capacité à traiter de longs textes.",
        validated: false, 
        url: "https://claude.ai/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Claude est un grand modèle de langage (LLM) développé par Anthropic, avec un accent distinct sur la sécurité, l'éthique et la minimisation des biais. Il est conçu pour être un assistant IA serviable, honnête et inoffensif. Claude peut gérer de longues conversations, analyser des documents étendus et effectuer des tâches complexes de raisonnement et de création de contenu textuel.",
            links: [
                { name: "Site officiel Claude AI", url: "https://claude.ai/" },
                { name: "Blog Anthropic (recherche et mises à jour)", url: "https://www.anthropic.com/news" },
                { name: "Philosophie de l'IA d'Anthropic", url: "https://www.anthropic.com/research" }
            ]
        }
    },
    { 
        name: "Adobe Firefly", 
        img: "logo_firefly.png", 
        type: ["image", "texte", "generative-ai", "design"], 
        description: "Famille de modèles d'IA générative d'Adobe pour la création de contenu.",
        validated: true, 
        url: "https://www.adobe.com/sensei/generative-ai/firefly.html",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Adobe Firefly est une famille de modèles d'IA générative directement intégrée aux applications créatives d'Adobe, comme Photoshop et Illustrator. Elle permet aux utilisateurs de transformer du texte en images (text-to-image), d'appliquer des effets de texte uniques, de générer des variations de couleur et bien plus encore, accélérant considérablement les processus de design et de création de contenu numérique.",
            links: [
                { name: "Page officielle Adobe Firefly", url: "https://www.adobe.com/sensei/generative-ai/firefly.html" },
                { name: "Galerie de créations Firefly", url: "https://www.adobe.com/sensei/generative-ai/firefly-gallery.html" },
                { name: "Firefly dans les produits Adobe", url: "https://www.adobe.com/fr/creativecloud/generative-ai/firefly-integrations.html" }
            ]
        }
    },
    { 
        name: "ElevenLabs", 
        img: "logo_elevenlabs.png", 
        type: ["audio", "texte", "voix", "synthèse vocale"], 
        description: "Plateforme leader dans la synthèse vocale avancée et de clonage de voix.",
        validated: true, 
        url: "https://elevenlabs.io/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "ElevenLabs est une plateforme d'IA de pointe pour la synthèse vocale et le clonage de voix. Elle permet de générer des voix synthétiques d'une qualité exceptionnelle, avec des intonations naturelles, des émotions variées et une prise en charge multilingue. C'est l'outil idéal pour les narrations, les livres audio, les doublages de vidéos, les assistants vocaux et toute application nécessitant une voix humaine réaliste.",
            links: [
                { name: "Site officiel ElevenLabs", url: "https://elevenlabs.io/" },
                { name: "Fonctionnalités principales", url: "https://elevenlabs.io/features" },
                { name: "Galerie de voix et exemples", url: "https://elevenlabs.io/voices" },
                { name: "Cas d'utilisation", url: "https://elevenlabs.io/use-cases" }
            ]
        }
    },
    { 
        name: "Photoshop", 
        img: "logo_photoshop.png", 
        type: ["image", "design", "retouche", "édition"], 
        description: "Logiciel de retouche d'image et de conception graphique incontournable, désormais enrichi de puissantes fonctionnalités IA.",
        validated: true, 
        url: "https://www.adobe.com/fr/products/photoshop.html",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Adobe Photoshop est le logiciel standard de l'industrie pour la manipulation d'images numériques. De la retouche photo complexe à la création d'œuvres d'art composites et de designs graphiques, Photoshop offre des outils inégalés. L'intégration des fonctionnalités d'IA générative (comme le Remplissage Génératif) par Adobe Firefly a révolutionné les possibilités de création et d'édition rapide, le rendant encore plus puissant.",
            links: [
                { name: "Page officielle Adobe Photoshop", url: "https://www.adobe.com/fr/products/photoshop.html" },
                { name: "Nouveautés et fonctionnalités IA", url: "https://www.adobe.com/fr/products/photoshop/generative-fill.html" },
                { name: "Tutoriels et guides Photoshop", url: "https://helpx.adobe.com/fr/photoshop/tutorials.html" }
            ]
        }
    },
    { 
        name: "Adobe Illustrator", 
        img: "logo_illustrator.png", 
        type: ["image", "design", "vectoriel", "illustration"], 
        description: "Logiciel de référence pour la création graphique vectorielle, idéal pour les logos et les illustrations.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/illustrator.html",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Adobe Illustrator est le logiciel de création graphique vectorielle le plus utilisé au monde. Il permet de créer des illustrations, des logos, des typographies, des icônes et des œuvres d'art complexes qui peuvent être mises à l'échelle à l'infini sans perte de résolution. Les outils basés sur l'IA d'Illustrator, comme la retouche de chemins simplifiée et la vectorisation d'images, améliorent l'efficacité du workflow créatif.",
            links: [
                { name: "Page officielle Adobe Illustrator", url: "https://www.adobe.com/fr/products/illustrator.html" },
                { name: "Tutoriels Illustrator", url: "https://helpx.adobe.com/fr/illustrator/tutorials.html" },
                { name: "Fonctionnalités d'Illustrator", url: "https://www.adobe.com/fr/products/illustrator/features.html" }
            ]
        }
    },
    { 
        name: "Adobe After Effects", 
        img: "logo_after_effects.png", 
        type: ["video", "animation", "effets visuels", "motion graphics"], 
        description: "Outil professionnel pour les effets visuels, les animations graphiques et la composition vidéo.",
        validated: false, 
        url: "https://www.adobe.com/fr/products/aftereffects.html",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Adobe After Effects est le logiciel de référence pour la création d'animations graphiques et d'effets visuels cinématographiques. Il est utilisé pour concevoir des titres animés, des génériques de films, des infographies animées et des compositions complexes intégrant des éléments 3D. Des fonctionnalités basées sur l'IA, comme le Rotobrush et le Content-Aware Fill, accélèrent des tâches de post-production chronophages.",
            links: [
                { name: "Page officielle After Effects", url: "https://www.adobe.com/fr/products/aftereffects.html" },
                { name: "Tutoriels After Effects", url: "https://helpx.adobe.com/fr/after-effects/tutorials.html" },
                { name: "Exemples de travaux (Behance)", url: "https://www.behance.net/search/projects/?field=102" } // Exemple de galerie de projets
            ]
        }
    },
    { 
        name: "Canva AI", 
        img: "logo_canva.png", 
        type: ["image", "texte", "design", "présentation", "générateur de contenu"], 
        description: "Intègre l'IA pour simplifier la création de designs graphiques, des présentations aux posts pour les réseaux sociaux.",
        validated: false, 
        url: "https://www.canva.com/fr_fr/fonctionnalites/magic-studio/",
        details: { // NOUVELLE PROPRIÉTÉ
            fullDescription: "Canva AI, à travers son 'Magic Studio', intègre de puissantes fonctionnalités d'intelligence artificielle pour simplifier et accélérer la création de designs pour tous. Des outils comme 'Magic Design' pour générer des mises en page complètes à partir de texte, 'Magic Edit' pour retoucher des images de manière avancée, ou 'Magic Write' pour la rédaction de contenu, rendent le design et la communication visuelle accessibles à tous, sans compétences graphiques préalables.",
            links: [
                { name: "Page Magic Studio de Canva", url: "https://www.canva.com/fr_fr/fonctionnalites/magic-studio/" },
                { name: "Blog Canva (articles sur l'IA)", url: "https://www.canva.com/fr_fr/learn/category/ai/" },
                { name: "Tutoriels Canva", url: "https://www.canva.com/fr_fr/apprendre/" }
            ]
        }
    }
];
