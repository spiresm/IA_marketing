import os
import json
import requests
from PIL import Image
from pathlib import Path
from urllib.parse import urlparse
from io import BytesIO

tools_file = "tools.json"
output_dir = Path("images")
output_dir.mkdir(exist_ok=True)

def sanitize_filename(name):
    return name.lower().replace(" ", "_").replace(".", "").replace("·", "e")

def download_and_convert_favicon(domain, filename_png):
    favicon_url = f"https://{domain}/favicon.ico"
    try:
        response = requests.get(favicon_url, timeout=5)
        if response.status_code == 200 and response.headers["Content-Type"].startswith("image"):
            ico_data = BytesIO(response.content)
            with Image.open(ico_data) as img:
                img.save(output_dir / filename_png, format="PNG")
            return True
        else:
            print(f"[--] Pas de favicon valide pour {domain}")
    except Exception as e:
        print(f"[!!] Erreur avec {favicon_url} : {e}")
    return False

with open(tools_file, "r", encoding="utf-8") as f:
    tools = json.load(f)

for tool in tools:
    domain = urlparse(tool["lien"]).netloc
    filename_png = f"{sanitize_filename(tool['nom'])}.png"
    logo_path = str(output_dir / filename_png).replace("\\", "/")

    if download_and_convert_favicon(domain, filename_png):
        tool["logo"] = logo_path
        print(f"[OK] Logo PNG généré pour {tool['nom']}")
    else:
        tool["logo"] = ""
        print(f"[--] Aucun logo disponible pour {tool['nom']}")

with open("tools_with_logos.json", "w", encoding="utf-8") as f:
    json.dump(tools, f, ensure_ascii=False, indent=2)

print("\n✅ Terminé : fichiers logos en PNG et tools_with_logos.json générés.")
