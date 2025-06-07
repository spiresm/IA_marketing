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
  async function getDemandes() {
  const res = await fetch("/.netlify/functions/getDemandesIA");
  if (!res.ok) throw new Error("Erreur récupération demandes");
  return await res.json();
}

async function afficherDemandes() {
  const recapList = document.getElementById("recapList");
  const filtreNom = document.getElementById("filtreNom").value.toLowerCase();
  const filtreDate = document.getElementById("filtreDate").value;
  const filtreDuree = document.getElementById("filtreDuree").value;

  let demandes = [];
  try {
    demandes = await getDemandes();
  } catch (err) {
    console.error("Erreur récupération :", err);
    recapList.innerHTML = "<p>Erreur chargement des demandes.</p>";
    return;
  }

  demandes = demandes.filter(d => d.nom.toLowerCase().includes(filtreNom));
  if (filtreDuree) demandes = demandes.filter(d => d.duree === filtreDuree);
  if (filtreDate === "asc") demandes.sort((a,b) => new Date(a.date) - new Date(b.date));
  else if (filtreDate === "desc") demandes.sort((a,b) => new Date(b.date) - new Date(a.date));

  recapList.innerHTML = "";

  demandes.forEach(d => {
    const couleur = couleursParChaine[d.chaine] || "#0077b6";
    const div = document.createElement("div");
    div.className = "ticket";
    div.style.borderLeftColor = couleur;
    div.innerHTML = `
      <div style="display:flex; justify-content: space-between; align-items:center">
        <span><strong>${d.nom}</strong></span>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.1em; font-weight: bold;">${d.type}</span>
          <span>${d.duree}</span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <span style="color:${couleur}; font-weight: bold">${d.chaine}</span>
        <small style="color:#666;">📅 ${d.date}</small>
      </div>
      <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <div>${d.traite ? '✅ Traité' : '⏳ En attente'}</div>
        <div>
          ${d.traite ? '' : `<button class="btn-traite" data-id="${d.id}">✔️</button>`}
          <button class="btn-supprimer" data-id="${d.id}">🗑️</button>
        </div>
      </div>`;

    div.querySelector(".btn-supprimer")?.addEventListener("click", async e => {
      e.stopPropagation();
      await supprimerDemande(d.id);
    });

    div.querySelector(".btn-traite")?.addEventListener("click", async e => {
      e.stopPropagation();
      await marquerTraite(d.id);
    });

    div.addEventListener("click", () => {
      const modal = document.getElementById("modal");
      const modalBody = document.getElementById("modal-body");
      modalBody.textContent = `${d.nom} - ${d.type} - ${d.duree} - ${d.support} - ${d.chaine}
Date : ${d.date}

${d.description}`;
      modal.style.display = "flex";
    });

    recapList.appendChild(div);
  });
}

async function supprimerDemande(id) {
  const demandes = await getDemandes();
  const filtered = demandes.filter(d => d.id !== id);
  await fetch("/.netlify/functions/updateDemandeIA", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filtered),
  });
  afficherDemandes();
  mettreAJourBulleDemandes();
}

async function marquerTraite(id) {
  const demandes = await getDemandes();
  const demande = demandes.find(d => d.id === id);
  if (!demande) return;
  demande.traite = true;
  await fetch("/.netlify/functions/updateDemandeIA", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(demande),
  });
  afficherDemandes();
  mettreAJourBulleDemandes();
}

});
