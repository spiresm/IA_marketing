// netlify/functions/pushPrompt.mjs

import { Buffer } from 'buffer'; // Assurez-vous que Buffer est importé si vous ne l'avez pas déjà

export async function handler(event) {
  console.log("✅ pushPrompt appelée");

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    if (!event.body) {
      console.error("❌ Aucune donnée reçue (body vide)");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Aucune donnée reçue" }),
      };
    }

    let prompt = JSON.parse(event.body); // Utiliser 'let' pour pouvoir modifier l'objet
    console.log("📥 Données reçues initiales :", prompt);

    // --- AJOUT AUTOMATIQUE DE LA DATE DE CRÉATION ---
    // Ajout ou mise à jour du champ date_ajout avec la date et l'heure actuelles
    prompt.date_ajout = new Date().toISOString(); 
    console.log(`✅ pushPrompt: 'date_ajout' ajoutée au prompt: ${prompt.date_ajout}`);
    // --- FIN DE L'AJOUT DE LA DATE ---

    const token = process.env.GITHUB_TOKEN;
    const repo = "spiresm/IA_marketing"; // Votre dépôt GitHub

    if (!token) throw new Error("❌ GITHUB_TOKEN manquant dans les variables d'environnement Netlify.");

    // Le chemin du fichier inclut déjà un timestamp pour l'unicité
    const path = `prompts/prompt-${Date.now()}.json`; 
    const githubUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    
    // Le contenu à envoyer à GitHub est maintenant l'objet 'prompt' mis à jour
    const content = Buffer.from(JSON.stringify(prompt, null, 2)).toString("base64");

    const res = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Ajout d’un prompt depuis le formulaire", // Message de commit
        content,
        branch: 'main', // Assurez-vous que c'est la bonne branche
      }),
    });

    const data = await res.json();
    console.log("📦 Réponse complète de GitHub :", data);

    if (!res.ok) {
      console.error(`❌ Erreur GitHub (${res.status}):`, data.message || "Erreur inconnue");
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Erreur GitHub" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" }, // Spécifier le type de contenu de la réponse
      body: JSON.stringify({ success: true, url: data.content.download_url, prompt: prompt }), // Inclure le prompt final dans la réponse
    };
  } catch (err) {
    console.error("❌ Erreur dans pushPrompt :", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Erreur interne du serveur: ${err.message}` }),
    };
  }
}
