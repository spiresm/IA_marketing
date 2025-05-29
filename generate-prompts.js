// generate-prompts.js
import fs from 'fs';

const sujets = [
  "OpenAI annonce un nouveau modèle",
  "Midjourney lance un outil vidéo",
  "Stability AI propose une plateforme audio",
  "Runway améliore la génération vidéo",
  "Mistral publie un modèle open-source",
  "Google DeepMind explore l’AGI",
  "Meta open-source un modèle IA",
  "Lumiere AI révolutionne les animations",
  "Perplexity.ai propose une IA de recherche",
  "Adobe Firefly s’intègre à Photoshop"
];

function getRandomArticles(n = 5) {
  const shuffled = sujets.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

const today = new Date().toISOString().slice(0, 10);
const prompts = getRandomArticles().map((titre, index) => ({
  titre,
  date: today,
  id: index + 1
}));

fs.writeFileSync('prompts.json', JSON.stringify(prompts, null, 2));
console.log("✅ prompts.json mis à jour :", prompts);
