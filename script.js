document.addEventListener("DOMContentLoaded", () => {
  const dureeSelect = document.getElementById("duree");
  for (let i = 0; i <= 60; i++) {
    const opt = document.createElement("option");
    opt.value = `${i} sec`;
    opt.textContent = `${i} sec`;
    dureeSelect.appendChild(opt);
  }

  document.getElementById("demandeIA").addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(e.target);
    const demande = {
      id: "_" + Math.random().toString(36).substr(2, 9),
      nom: data.get("nom"),
      email: `${data.get("emailPrefix")}@rtbf.be`,
      type: data.get("type"),
      support: data.get("support"),
      duree: data.get("duree"),
      date: data.get("date"),
      description: data.get("description"),
      chaine: data.get("chaine"),
      traite: false
    };

    try {
      await fetch("/.netlify/functions/updateDemandeIA", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande)
      });

      await fetch("/.netlify/functions/sendRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande)
      });

      alert("Demande envoyée avec succès et mail transmis !");
      e.target.reset();

      afficherDemandes();
      mettreAJourBulleDemandes();
    } catch (err) {
      console.error("Erreur d'envoi :", err);
      alert("Le ticket est créé, mais l'envoi d'e-mail a échoué.");
      e.target.reset();

      afficherDemandes();
      mettreAJourBulleDemandes();
    }
  });

  document.getElementById("filtreNom").addEventListener("input", afficherDemandes);
  document.getElementById("filtreDate").addEventListener("change", afficherDemandes);
  document.getElementById("filtreDuree").addEventListener("change", afficherDemandes);

  document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
  });

  document.getElementById("modal").addEventListener("click", e => {
    if (e.target.id === "modal") {
      e.target.style.display = "none";
    }
  });

  afficherDemandes();
  mettreAJourBulleDemandes();
});
