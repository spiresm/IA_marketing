<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Créer ou éditer un profil</title>
    <link rel="stylesheet" href="style.css" />
    <style>
        body {
            font-family: sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            opacity: 0;
            transition: opacity 0.3s ease-in;
        }
        main {
            display: none;
        }
        .container {
            max-width: 600px;
            background: white;
            margin: 40px auto;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        #back-to-team {
            background-color: #e0f3fc;
            color: #0077b6;
            border: 1px solid #0077b6;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            margin-bottom: 20px;
            transition: background-color 0.2s ease;
            display: none;
        }
        #back-to-team:hover {
            background-color: #d0ecf8;
        }
        h1 {
            text-align: center;
            color: #0077b6;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        input, select, textarea {
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #ccc;
            font-size: 1rem;
        }
        button {
            padding: 12px;
            background: #0077b6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
        }
        #image-preview {
            max-width: 100px;
            margin: auto;
            display: none;
            border-radius: 8px;
        }
        #loading-indicator {
            display: none;
            text-align: center;
            margin-top: 10px;
            color: #0077b6;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="header-placeholder"></div>
    <main>
        <div class="container">
            <button id="back-to-team">← Retour à l’équipe</button>

            <h1 id="form-title">Créer un profil</h1>
            <form id="profil-form">
                <input type="text" id="name" placeholder="Nom complet" required />
                <select id="pole" required>
                    <option value="">-- Sélectionner un pôle --</option>
                    <option value="Pôle créa.">Pôle créa.</option>
                    <option value="CRM">CRM</option>
                    <option value="Communication">Communication</option>
                    <option value="Partenariats">Partenariats</option>
                    <option value="Marketing digital">Marketing digital</option>
                    <option value="Positionnement">Positionnement</option>
                </select>

                <label>Image de profil :</label>
                <input type="file" id="photo-upload" accept="image/*" />
                <img id="image-preview" alt="Aperçu image" />

                <label>Outils IA maîtrisés :</label>
                <div id="tools-list"></div>

                <label for="note">Note personnelle :</label>
                <textarea id="note" name="note" placeholder="Ajouter une note sur ce profil..."></textarea>

                <button type="submit" id="submit-btn">Créer</button>
                <div id="loading-indicator">⏳ Enregistrement en cours...</div>
            </form>
        </div>
    </main>
    <script>
        const allTools = [
            "ChatGPT", "Claude", "Midjourney", "DALL·E", "Stable Diffusion", "Firefly",
            "Runway ML", "Perplexity", "Notion AI", "Gemini", "Copilot", "Bard",
            "Pika", "Sora", "Luma AI", "Kling AI", "Genny by Lovo", "ElevenLabs",
            "Murf", "Voicemaker", "Suno.ai", "MusicFX", "Boomy", "Riffusion",
            "Jules", "Devstral", "Codeium", "Bolt"
        ];

        let uploadedImagePath = "";
        let editingProfil = null;

        const nameInput = document.getElementById("name");
        const poleSelect = document.getElementById("pole");
        const toolsDiv = document.getElementById("tools-list");
        const title = document.getElementById("form-title");
        const submitBtn = document.getElementById("submit-btn");
        const photoInput = document.getElementById("photo-upload");
        const imagePreview = document.getElementById("image-preview");
        const loadingIndicator = document.getElementById("loading-indicator");
        const noteInput = document.getElementById("note");
        const backBtn = document.getElementById("back-to-team");

        const params = new URLSearchParams(window.location.search);
        const editName = decodeURIComponent(params.get("edit") || "");

        // Utilisation d'un chemin absolu pour le header.html
        fetch("/header.html")
            .then(response => response.text())
            .then(data => {
                document.getElementById("header-placeholder").innerHTML = data;

                requestAnimationFrame(() => {
                    document.body.style.opacity = "1";
                    document.querySelector("main").style.display = "block";

                    allTools.forEach(tool => {
                        const label = document.createElement("label");
                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.value = tool;
                        label.appendChild(checkbox);
                        label.append(" " + tool);
                        toolsDiv.appendChild(label);
                        toolsDiv.appendChild(document.createElement("br"));
                    });

                    if (editName) {
                        backBtn.style.display = "inline-block";
                        backBtn.addEventListener("click", () => {
                            window.location.href = "equipe.html";
                        });

                        fetch("/.netlify/functions/getProfils")
                            .then(res => res.json())
                            .then(data => {
                                const profilsArray = Array.isArray(data) ? data : data.profils;
                                if (!Array.isArray(profilsArray)) throw new Error("Données invalides");
                                const profil = profilsArray.find(p => p.id === editName);
                                if (profil) {
                                    editingProfil = profil;
                                    nameInput.value = profil.name;

                                    const existingOption = [...poleSelect.options].find(opt => opt.value === profil.pole);
                                    if (!existingOption && profil.pole) {
                                        const newOpt = document.createElement("option");
                                        newOpt.value = profil.pole;
                                        newOpt.textContent = profil.pole;
                                        poleSelect.appendChild(newOpt);
                                    }
                                    poleSelect.value = profil.pole || "";

                                    uploadedImagePath = profil.photo || "";
                                    if (uploadedImagePath) {
                                        imagePreview.src = uploadedImagePath;
                                        imagePreview.style.display = "block";
                                    }

                                    const outils = profil.tools || [];
                                    toolsDiv.querySelectorAll("input").forEach(cb => {
                                        if (outils.includes(cb.value)) cb.checked = true;
                                    });

                                    noteInput.value = profil.note || "";

                                    title.textContent = "Modifier le profil";
                                    submitBtn.textContent = "Mettre à jour";
                                }
                            })
                            .catch(error => {
                                console.error("Erreur lors de la récupération du profil :", error);
                                alert("Erreur lors du chargement du profil à éditer.");
                            });
                    }

                    photoInput.addEventListener("change", async e => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const fileContent = reader.result.split(',')[1]; // La partie base64 pure
                            const fileName = file.name;

                            console.log("Préparation de l'upload pour uploadImage.mjs:");
                            console.log("fileName:", fileName);
                            console.log("fileContent (début):", fileContent ? fileContent.substring(0, 50) + "..." : "Vide");

                            const res = await fetch("/.netlify/functions/uploadImage", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                // Le frontend envoie bien 'fileContent'
                                body: JSON.stringify({ fileContent: fileContent, fileName: fileName })
                            });

                            if (res.ok) {
                                const result = await res.json();
                                if (result.url) {
                                    uploadedImagePath = result.url;
                                    imagePreview.src = uploadedImagePath;
                                    imagePreview.style.display = "block";
                                    alert("Image uploadée avec succès !");
                                } else {
                                    alert("L'URL d'image est manquante dans la réponse.");
                                }
                            } else {
                                const errorData = await res.json();
                                alert("Échec de l'upload de l'image : " + (errorData.message || "Erreur inconnue"));
                            }
                        };
                        reader.readAsDataURL(file);
                    });

                    document.getElementById("profil-form").addEventListener("submit", function(e) {
                        e.preventDefault();

                        const triggerTime = Date.now();

                        loadingIndicator.style.display = "block";
                        loadingIndicator.textContent = "⏳ Enregistrement du profil...";
                        submitBtn.disabled = true;

                        const updatedProfil = {
                            id: editingProfil?.id || "_" + Math.random().toString(36).substr(2, 9),
                            name: nameInput.value.trim(),
                            pole: poleSelect.value,
                            photo: uploadedImagePath,
                            tools: [...toolsDiv.querySelectorAll("input:checked")].map(c => c.value),
                            note: noteInput.value.trim()
                        };

                        if (!updatedProfil.name) {
                            alert("Le nom ne peut pas être vide.");
                            loadingIndicator.style.display = "none";
                            submitBtn.disabled = false;
                            return;
                        }

                        fetch("/.netlify/functions/updateProfil", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(updatedProfil),
                        })
                            .then(async (res) => {
                                const data = await res.json();
                                if (data.success) {
                                    loadingIndicator.textContent = "✅ Profil enregistré. ⏳ Attente du déploiement Netlify...";

                                    const waitForDeploy = async () => {
                                        let attempts = 0;
                                        const maxAttempts = 20;
                                        const delay = 2000;

                                        while (attempts < maxAttempts) {
                                            try {
                                                const res = await fetch("/.netlify/functions/checkDeployStatus", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ triggerTime })
                                                });
                                                const status = await res.json();

                                                if (status.status === "ready") {
                                                    return true;
                                                }
                                            } catch (err) {
                                                console.error("Erreur durant la vérification du déploiement :", err);
                                            }

                                            attempts++;
                                            loadingIndicator.textContent = `✅ Profil enregistré. ⏳ Vérification ${attempts}/${maxAttempts}...`;
                                            await new Promise(r => setTimeout(r, delay));
                                        }

                                        return false;
                                    };

                                    const isReady = await waitForDeploy();

                                    if (isReady) {
                                        window.location.href = "equipe.html";
                                    } else {
                                        loadingIndicator.textContent = "⚠️ Le site n'est pas encore à jour. Rechargez l'équipe dans quelques instants.";
                                    }

                                } else {
                                    alert("Erreur : " + (data.error || "Échec inconnu"));
                                }
                            })
                            .catch((err) => {
                                console.error(err);
                                alert("Erreur de communication avec le serveur.");
                            })
                            .finally(() => {
                                submitBtn.disabled = false;
                            });
                    });
                });
            });
    </script>
</body>
</html>
