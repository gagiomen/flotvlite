# 📺 FloLite Universal 3.0 (Apex Titanium) - Versiunea Web & Proxy Server

Versiune web complet responsive și optimizată a aplicației **FloLite Universal 3.0**, concepută pentru a rula în orice browser modern (pe PC, laptop, telefon mobil Android/iOS, tabletă, Android Auto browser sau Smart TV / Android TV / Tizen / webOS).

---

## ✨ Noutăți & Funcționalități v3.0.0-PRO

- **⚡ Screen Wake Lock API**: Ecranul rămâne deschis automat pe telefon și tabletă pe toată durata redării unui flux video. La redarea posturilor Radio, Wake Lock este eliberat inteligent pentru economisirea bateriei.
- **📡 Suport Web Cast (Chromecast)**: Buton dedicat Cast pe player pentru proiectarea rapidă a fluxurilor pe televizoare și ecrane inteligente compatibile.
- **🚗 Integrare MediaSession API**:
  - Afișare metadate canal, categorie și siglă HD pe ecranul de blocare (Lock Screen) și în bara de notificări.
  - Suport pentru comenzi media Bluetooth în mașină și compatibilitate cu browserele auto (Android Auto / CarPlay).
- **🎨 199 Sigle HD Integrate**: Toate posturile TV și Radio beneficiază de sigle oficiale HD sincronizate la zi.
- **ℹ️ Dialog Interactiv „Despre FloLite”**:
  - Istoric complet de dezvoltare al proiectului (v1.0 Prototip ➔ v2.0 TV Zero-Allocation ➔ v2.5 Web Cloudflare ➔ v3.0 Ecosistem Universal & Auto).
  - Diagnostic live în timp real (Player Engine, Rezoluție, Buffer, Wake Lock, MediaSession, Număr Canale, Stare Proxy).
- **📻 Mod Radio cu Spectrometru Winamp**: Animație audio pe Canvas HTML5 cu efecte neon și culori dinamice.
- **📺 Ghid TV Electronic (EPG)**: Încărcare automată a emisiunii curente, timpului de difuzare și barei de progres în timp real.
- **⌨️ Navigare completă din Telecomandă / Tastatură**:
  - `Săgeți Sus / Jos`: Navigare canale
  - `Enter / OK`: Selectare canal
  - `F`: Ecran complet
  - `M`: Mute / Unmute
  - `0 - 9`: Salt direct la numărul canalului
  - `/`: Căutare rapidă canal
- **🛡️ Proxy CORS & Header Injection**: Cloudflare Pages Functions `/proxy` preconfigurat nativ + suport pentru Cloudflare Workers și server Python/Node local.

---

## 🚀 Opțiuni de Găzduire Gratuită

### 🌐 Opțiunea 1: Cloudflare Pages (Recomandat – 100% Gratuit & Serverless)
Cea mai rapidă soluție CDN la nivel global, cu suport integrat de Functions:

1. Fă cont pe [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Mergi la **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
3. Selectează repository-ul tău GitHub: `gagiomen/flotvlite`.
4. La **Build Settings**:
   - **Framework preset**: `None`
   - **Build command**: `echo "Build Ready"` (sau lasă gol dacă permite)
   - **Build output directory**: `public`
5. Apasă pe **Save and Deploy**. Cloudflare va prelua automat atât interfața web din `public/`, cât și funcția proxy serverless din `functions/proxy.js`.
6. Site-ul tău va rula instant pe un domeniu securizat gratuit: `https://flotvlite.pages.dev`.

---

### 🟢 Opțiunea 2: Render.com (Container Gratuit Python)
1. Creează cont pe [Render.com](https://render.com).
2. Creează un nou repository sau conectează repo-ul `flotvlite`.
3. În Render Dashboard apasă pe **New +** ➔ **Web Service** și conectează repo-ul.
4. Configurează setările:
   - **Environment**: `Python 3`
   - **Build Command**: `echo Ready`
   - **Start Command**: `python3 server.py`
   - **Instance Type**: `Free`
5. Apasă pe **Deploy Web Service**.

---

### 💻 Opțiunea 3: Rulare Locală în Rețeaua de Acasă
```bash
cd /home/florin/flolite_web
python3 server.py
# sau cu Node.js:
# node server.js
```
Accesează în browser pe orice dispozitiv din casă: `http://192.168.1.161:3000`.
