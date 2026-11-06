# 📺 Flo Lite TV - Versiunea Web & Proxy Server

Versiune web complet responsive a aplicației **Flo Lite TV**, concepută pentru a rula în orice browser (pe PC, laptop, telefon mobil, tabletă sau browserul unui Smart TV / Android TV / Tizen / webOS).

---

## ✨ Funcționalități
- **Player HLS.js Integrat**: Suport nativ pentru stream-uri live Full HD și 4K UHD.
- **286 Canale & Posturi Radio**:
  - 181 Canale TV organizate pe categorii (Generaliste, Știri, Sport, Filme, Documentare, Muzică, Copii, Moldova, etc.)
  - 105 Posturi Radio Live
- **Ghid TV Electronic (EPG)**: Încărcare automată a emisiunii curente, timpului de difuzare și barei de progres în timp real.
- **Vizualizator Audio Radio (Stil Winamp)**: Animație pe Canvas HTML5 cu spectrometru de frecvențe și efecte neon în modul Radio.
- **Navigare completă din Telecomandă / Tastatură**:
  - `Săgeți Sus / Jos`: Navigare canale
  - `Enter / OK`: Selectare canal
  - `F`: Ecran complet
  - `M`: Mute / Unmute
  - `0 - 9`: Salt direct la numărul canalului
  - `/`: Căutare rapidă canal
- **Proxy CORS & Header Injection**: Permite redarea fluxurilor protejate care solicită header-e de `Referer` sau care nu au CORS nativ.

---

## 🚀 Opțiuni de Găzduire Gratuită

### 🟢 Opțiunea 1: Render.com (Cea mai simplă – All-in-One Gratuit)
Găzduiește gratuit atât interfața web, cât și proxy-ul de stream într-un singur container Python.

1. Creează un cont gratuit pe [Render.com](https://render.com).
2. Creează un nou repository pe GitHub și urcă folderul `flolite_web`.
3. În Render Dashboard apasă pe **New +** ➔ **Web Service** și conectează repo-ul tău.
4. Configurează setările:
   - **Environment**: `Python 3`
   - **Build Command**: `echo Ready`
   - **Start Command**: `python3 server.py`
   - **Instance Type**: `Free`
5. Apasă pe **Deploy Web Service**.
6. Vei primi un URL securizat HTTPS (de exemplu `https://flolite-tv.onrender.com`) care funcționează instant pe orice dispozitiv!

---

### 🌐 Opțiunea 2: Cloudflare Pages + Cloudflare Worker (Ultra-rapid, 100% Serverless)
Cea mai rapidă soluție CDN din lume, gratuită pe viață.

#### Pasul A: Proxy-ul (Cloudflare Worker)
1. Fă cont pe [Cloudflare](https://dash.cloudflare.com).
2. Mergi la **Workers & Pages** ➔ **Create application** ➔ **Create Worker**.
3. Denumește-l `flolite-proxy` și apasă **Deploy**.
4. Apasă pe **Quick Edit**, șterge codul existent și lipește conținutul fișierului [`cloudflare_worker.js`](cloudflare_worker.js).
5. Salvează și apasă **Deploy**. Vei avea un URL de forma `https://flolite-proxy.<contul-tau>.workers.dev`.

#### Pasul B: Interfața Web (Cloudflare Pages)
1. În Cloudflare Dashboard mergi la **Workers & Pages** ➔ **Pages** ➔ **Upload assets**.
2. Trage direct conținutul folderului `public/` (fișierele `index.html`, `style.css`, `app.js`, `channels.json`, folderul `logos/`, etc.).
3. Denumește proiectul `flolite-tv` și finalizează.
4. Deschide site-ul generat (ex: `https://flolite-tv.pages.dev`), apasă pe rotița de **Setări ⚙️** și alege **Server Proxy Personalizat**, introducând URL-ul worker-ului tău creat la Pasul A.

---

### 💻 Opțiunea 3: Rulare Locală în Rețeaua de Acasă (Fără server extern)
Poți porni serverul direct pe acest laptop, iar oricine este conectat la Wi-Fi-ul casei (inclusiv televizoarele din casă) îl poate deschide:

```bash
cd /home/florin/flolite_web
python3 server.py
```

Apoi deschizi în browserul televizorului, telefonului sau tabletei adresa IP a laptopului:
`http://192.168.1.161:3000`
