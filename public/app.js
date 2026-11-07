/**
 * Flo Lite TV - Web Progressive Player
 * Ultra-fast, lightweight IPTV & Radio client with HLS.js, EPG, & Winamp Visualizer.
 */

// Application State
const state = {
  channels: [],
  tvChannels: [],
  radioChannels: [],
  epg: {},
  currentMode: 'tv', // 'tv' or 'radio'
  currentCategory: 'TOATE',
  searchQuery: '',
  filteredChannels: [],
  currentChannel: null,
  lastTvChannel: null,
  lastRadioChannel: null,
  focusedIndex: 0,
  proxyMode: localStorage.getItem('flolite_proxy_mode') || 'auto',
  customProxyUrl: localStorage.getItem('flolite_custom_proxy') || '',
  visualizerTheme: localStorage.getItem('flolite_vis_theme') || 'classic',
  hls: null,
  audioContext: null,
  analyser: null,
  audioSource: null,
  isVisualizerRunning: false,
  osdTimeout: null,
  numBuffer: '',
  numBufferTimeout: null
};

// DOM References
const dom = {
  video: document.getElementById('video-player'),
  playerWrapper: document.getElementById('player-wrapper'),
  playerControlsBar: document.querySelector('.player-controls-bar'),
  radioBackdrop: document.getElementById('radio-backdrop'),
  visualizerCanvas: document.getElementById('visualizer-canvas'),
  radioLogo: document.getElementById('radio-logo'),
  radioName: document.getElementById('radio-name'),
  radioGenre: document.getElementById('radio-genre'),
  radioThemeName: document.getElementById('visualizer-theme-name'),
  osdBanner: document.getElementById('osd-banner'),
  osdLogo: document.getElementById('osd-logo'),
  osdNum: document.getElementById('osd-channel-num'),
  osdName: document.getElementById('osd-channel-name'),
  osdRes: document.getElementById('osd-badge-res'),
  osdGroup: document.getElementById('osd-group'),
  osdEpgNow: document.getElementById('osd-epg-now'),
  osdEpgTitle: document.getElementById('osd-epg-title'),
  osdEpgTime: document.getElementById('osd-epg-time'),
  osdProgressBar: document.getElementById('osd-progress-bar'),
  osdProgressFill: document.getElementById('osd-progress-fill'),
  spinner: document.getElementById('player-spinner'),
  pillChannel: document.getElementById('pill-current-channel'),
  detailName: document.getElementById('detail-name'),
  detailSub: document.getElementById('detail-sub'),
  detailLogo: document.getElementById('detail-logo'),
  badgeTechRes: document.getElementById('badge-tech-res'),
  badgeTechCodec: document.getElementById('badge-tech-codec'),
  epgLiveTime: document.getElementById('epg-live-time'),
  epgLiveTitle: document.getElementById('epg-live-title'),
  epgLiveSynopsis: document.getElementById('epg-live-synopsis'),
  epgMeterFill: document.getElementById('epg-meter-fill'),
  categoriesBar: document.getElementById('categories-bar'),
  channelsContainer: document.getElementById('channels-container'),
  channelCounter: document.getElementById('channel-counter'),
  btnModeTv: document.getElementById('btn-mode-tv'),
  btnModeRadio: document.getElementById('btn-mode-radio'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnMute: document.getElementById('btn-mute'),
  volumeSlider: document.getElementById('volume-slider'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  btnPip: document.getElementById('btn-pip'),
  btnCast: document.getElementById('btn-cast'),
  btnAbout: document.getElementById('btn-about'),
  aboutModal: document.getElementById('about-modal'),
  btnCloseAbout: document.getElementById('btn-close-about'),
  btnAboutClose: document.getElementById('btn-about-close'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  proxyModeSelect: document.getElementById('proxy-mode-select'),
  customProxyGroup: document.getElementById('custom-proxy-group'),
  customProxyInput: document.getElementById('custom-proxy-url'),
  visThemeSelect: document.getElementById('visualizer-theme-select')
};

// Initialize Application
async function init() {
  setupEventListeners();
  setupSettings();
  setupAboutModal();
  setupCast();
  setupKeyboardShortcuts();

  // Load Channels & EPG in parallel
  try {
    const [channelsRes, epgRes] = await Promise.all([
      fetch('channels.json').then(r => r.json()),
      fetch('epg_initial.json').then(r => r.json()).catch(() => ({}))
    ]);

    state.channels = channelsRes;
    state.tvChannels = channelsRes.filter(c => !c.is_radio);
    state.radioChannels = channelsRes.filter(c => c.is_radio);
    state.epg = epgRes || {};

    // Restore last mode & last played channel
    const savedMode = localStorage.getItem('flolite_last_mode') || 'tv';
    switchMode(savedMode, true);

    // Periodic EPG progress tick
    setInterval(updateLiveEpgUI, 30000);
  } catch (err) {
    console.error('Eroare la incarcarea datelor:', err);
    alert('Eroare la incarcarea canalelor. Verifica conexiunea la server.');
  }
}

// Switch Mode (TV / Radio)
function switchMode(mode, playTarget = true) {
  state.currentMode = mode;
  state.currentCategory = 'TOATE';
  localStorage.setItem('flolite_last_mode', mode);

  if (mode === 'tv') {
    dom.btnModeTv.classList.add('active');
    dom.btnModeRadio.classList.remove('active');
  } else {
    dom.btnModeRadio.classList.add('active');
    dom.btnModeTv.classList.remove('active');
  }

  buildCategories();
  filterAndRenderChannels();

  if (playTarget) {
    let target = null;
    if (mode === 'tv') {
      const savedTvId = localStorage.getItem('flolite_last_tv_channel_id') || localStorage.getItem('flolite_last_channel_id');
      target = state.lastTvChannel || state.tvChannels.find(c => c.id === savedTvId) || state.tvChannels[0];
    } else {
      const savedRadioId = localStorage.getItem('flolite_last_radio_channel_id');
      target = state.lastRadioChannel || state.radioChannels.find(c => c.id === savedRadioId) || state.radioChannels[0];
    }

    if (target) {
      playChannel(target);
      const cardIdx = state.filteredChannels.indexOf(target);
      if (cardIdx >= 0) focusCard(cardIdx);
    }
  }
}

// Category Icon Resolver
function getCategoryIcon(cat, mode) {
  const norm = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (norm === 'toate') return mode === 'tv' ? '✨' : '📻';
  if (norm.includes('general')) return '📡';
  if (norm.includes('stiri')) return '📰';
  if (norm.includes('sport')) return '⚽';
  if (norm.includes('film') || norm.includes('cinema') || norm.includes('hbo')) return '🎬';
  if (norm.includes('doc')) return '🦁';
  if (norm.includes('folclor')) return '🎻';
  if (norm.includes('muzic') || norm.includes('music')) return '🎵';
  if (norm.includes('desene') || norm.includes('copii') || norm.includes('kids') || norm.includes('animat')) return '🧸';
  if (norm.includes('4k') || norm.includes('uhd')) return '💎';
  if (norm.includes('adult')) return '🔞';
  if (norm.includes('favorit')) return '⭐';
  if (norm.includes('moldova')) return '🇲🇩';
  if (norm.includes('romania') || norm.includes('national')) return '🇷🇴';
  if (norm.includes('transilvania')) return '🌲';
  if (norm.includes('banat')) return '🏰';
  if (norm.includes('muntenia')) return '🏙️';
  if (norm.includes('oltenia')) return '🌄';
  if (norm.includes('dobrogea') || norm.includes('mare')) return '🌊';
  if (norm.includes('diaspora')) return '✈️';
  if (norm.includes('internat')) return '🌍';
  if (norm.includes('oldies') || norm.includes('retro')) return '🎙️';
  if (norm.includes('greek')) return '🏛️';
  if (norm.includes('rock') || norm.includes('alt') || norm.includes('pop')) return '🎸';
  if (norm.includes('undernet') || norm.includes('ip') || norm.includes('online')) return '🌐';
  return mode === 'tv' ? '📺' : '📻';
}

// Build Categories Chips
function buildCategories() {
  const currentList = (state.currentMode === 'tv') ? state.tvChannels : state.radioChannels;
  const groupsSet = new Set();
  groupsSet.add('TOATE');

  currentList.forEach(c => {
    let grp = c.group || 'Altele';
    if (state.currentMode === 'radio') {
      grp = grp.replace('Radio - ', '').replace('Romania', 'România').trim();
    }
    groupsSet.add(grp);
  });

  const categories = Array.from(groupsSet);
  dom.categoriesBar.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `category-chip ${cat === state.currentCategory ? 'active' : ''}`;
    const icon = getCategoryIcon(cat, state.currentMode);
    chip.innerHTML = `<span class="category-icon">${icon}</span><span class="category-text">${cat}</span>`;
    chip.addEventListener('click', () => {
      state.currentCategory = cat;
      document.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
      filterAndRenderChannels();
    });
    dom.categoriesBar.appendChild(chip);
  });
}

// Filter and Render Channel Cards
function filterAndRenderChannels() {
  const sourceList = (state.currentMode === 'tv') ? state.tvChannels : state.radioChannels;
  const query = state.searchQuery.toLowerCase().trim();

  state.filteredChannels = sourceList.filter(c => {
    // Category match
    if (state.currentCategory !== 'TOATE') {
      let grp = (c.group || 'Altele').replace('Radio - ', '').replace('Romania', 'România').trim();
      if (grp !== state.currentCategory && c.group !== state.currentCategory) {
        return false;
      }
    }
    // Search query match
    if (query) {
      const matchName = c.name && c.name.toLowerCase().includes(query);
      const matchGroup = c.group && c.group.toLowerCase().includes(query);
      return matchName || matchGroup;
    }
    return true;
  });

  // Sort alphabetically in all categories (including TOATE) with Romanian locale collation
  state.filteredChannels.sort((a, b) => {
    return (a.name || '').localeCompare(b.name || '', 'ro', { sensitivity: 'base', numeric: true });
  });

  if (dom.channelCounter) {
    dom.channelCounter.textContent = `${state.filteredChannels.length} ${state.currentMode === 'tv' ? 'Canale TV' : 'Posturi Radio'}`;
  }
  dom.channelsContainer.innerHTML = '';

  state.filteredChannels.forEach((c, index) => {
    const card = document.createElement('div');
    const isPlaying = state.currentChannel && state.currentChannel.id === c.id;
    card.className = `channel-card ${isPlaying ? 'active' : ''}`;
    card.tabIndex = 10 + index;
    card.dataset.index = index;

    // EPG Snippet
    let epgSnippet = c.group || '';
    if (!c.is_radio && c.epg_id && state.epg[c.epg_id]) {
      const currentProg = getCurrentEpg(c.epg_id);
      if (currentProg) {
        epgSnippet = `Acum: ${currentProg.title}`;
      }
    }

    // Badge
    let badgeHtml = '';
    if (!c.is_radio) {
      const res = (c.resolution || 'HD').toUpperCase();
      badgeHtml = `<span class="channel-card-badge ${res === '4K' ? 'badge-4k' : ''}">${res}</span>`;
    }

    const logoSrc = c.logo ? c.logo : (c.is_radio ? 'logos/discomix.png' : 'logos/acasa4k.png');

    card.innerHTML = `
      <span class="channel-card-num">${index + 1}</span>
      <img class="channel-card-logo" src="${logoSrc}" alt="" loading="lazy" onerror="this.src='logos/acasa4k.png'">
      <div class="channel-card-info">
        <div class="channel-card-name">${isPlaying ? '▶ ' : ''}${c.name}</div>
        <div class="channel-card-epg">${epgSnippet}</div>
      </div>
      ${badgeHtml}
    `;

    card.addEventListener('click', () => {
      playChannel(c);
      focusCard(index);
    });

    dom.channelsContainer.appendChild(card);
  });
}

// Resolve Proxy URL
function resolveStreamUrl(channel) {
  let rawUrl = (channel.streams && channel.streams.length > 0) ? channel.streams[0].url : channel.url;
  if (!rawUrl) return '';

  const referer = (channel.headers && channel.headers.Referer) ? channel.headers.Referer : 'https://canale-tv.net/';

  // Proxy decision
  if (state.proxyMode === 'direct') {
    return rawUrl;
  }

  if (state.proxyMode === 'custom' && state.customProxyUrl) {
    const base = state.customProxyUrl.endsWith('=') ? state.customProxyUrl : state.customProxyUrl + '?url=';
    return `${base}${encodeURIComponent(rawUrl)}&ref=${encodeURIComponent(referer)}`;
  }

  // Relative / Auto: Use relative /proxy?url=
  // This automatically works with the included Node.js server OR Cloudflare Worker
  const isLocalServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port !== '';
  if (state.proxyMode === 'relative' || state.proxyMode === 'auto') {
    // If hosted on GitHub Pages or custom static host without backend proxy, user can specify custom worker
    return `/proxy?url=${encodeURIComponent(rawUrl)}&ref=${encodeURIComponent(referer)}`;
  }

  return rawUrl;
}

// Play Channel
function playChannel(channel) {
  state.currentChannel = channel;
  localStorage.setItem('flolite_last_channel_id', channel.id);

  if (channel.is_radio) {
    state.lastRadioChannel = channel;
    localStorage.setItem('flolite_last_radio_channel_id', channel.id);
  } else {
    state.lastTvChannel = channel;
    localStorage.setItem('flolite_last_tv_channel_id', channel.id);
  }

  dom.spinner.classList.remove('hidden');
  updateDetailsPanel(channel);
  showOsd(channel);

  // Update active state in list
  document.querySelectorAll('.channel-card').forEach(el => el.classList.remove('active'));
  const card = dom.channelsContainer.querySelector(`.channel-card[data-index="${state.filteredChannels.indexOf(channel)}"]`);
  if (card) card.classList.add('active');

  const streamUrl = resolveStreamUrl(channel);
  console.log(`[FloLiteTV] Redare ${channel.name} -> ${streamUrl}`);

  updateMediaSession(channel);

  if (channel.is_radio) {
    releaseScreenWakeLock();
    dom.radioBackdrop.classList.remove('hidden');
    dom.radioName.textContent = channel.name;
    dom.radioGenre.textContent = channel.group || 'Radio Live HD';
    dom.radioLogo.src = channel.logo || 'logos/discomix.png';
    startVisualizer();
  } else {
    requestScreenWakeLock();
    dom.radioBackdrop.classList.add('hidden');
    stopVisualizer();
  }

  // Destroy previous HLS player & reset HTMLMediaElement
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
  dom.video.pause();
  dom.video.removeAttribute('src');
  dom.video.load();

  // Check HLS.js support vs Native HLS
  const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/proxy');

  if (isHls && window.Hls && Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      startFragPrefetch: true,
      maxBufferLength: 20,
      maxMaxBufferLength: 45,
      maxBufferSize: 60 * 1000 * 1000,
      backBufferLength: 15,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 8,
      liveDurationInfinity: true,
      lowLatencyMode: false,
      manifestLoadingTimeOut: 12000,
      manifestLoadingMaxRetry: 5,
      manifestLoadingRetryDelay: 1000,
      levelLoadingTimeOut: 12000,
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 1000,
      fragLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 6,
      fragLoadingRetryDelay: 1000,
      nudgeOffset: 0.1,
      nudgeMaxRetry: 5,
      autoStartLoad: true
    });

    state.hls = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(dom.video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      dom.video.play().catch(() => {});
      dom.spinner.classList.add('hidden');
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn('[Hls.js Fatal Error]', data);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('[Hls.js] Eroare retea, reincercare automata...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('[Hls.js] Eroare media, recuperare decodor...');
            hls.recoverMediaError();
            break;
          default:
            console.error('[Hls.js] Eroare irecuperabila:', data);
            hls.destroy();
            dom.spinner.classList.add('hidden');
            break;
        }
      } else if (data.details === 'bufferStalledError') {
        if (dom.video && !dom.video.paused && dom.video.currentTime > 0) {
          dom.video.currentTime += 0.05;
        }
      }
    });
  } else {
    // Native HTML5 / Safari HLS / MP3 Radio
    dom.video.src = streamUrl;
    dom.video.play().catch(() => {});
    dom.video.onloadeddata = () => dom.spinner.classList.add('hidden');
  }

  dom.btnPlayPause.textContent = '⏸';
}

// OSD Banner Display
function showOsd(channel) {
  const idx = state.filteredChannels.indexOf(channel);
  dom.osdNum.textContent = (idx >= 0 ? idx + 1 : 1);
  dom.osdName.textContent = channel.name;
  dom.osdGroup.textContent = channel.group || 'Live';
  dom.osdRes.textContent = (channel.resolution || (channel.is_radio ? 'RADIO' : 'HD')).toUpperCase();
  dom.osdLogo.src = channel.logo || (channel.is_radio ? 'logos/discomix.png' : 'logos/acasa4k.png');

  // EPG
  if (!channel.is_radio && channel.epg_id && state.epg[channel.epg_id]) {
    const p = getCurrentEpg(channel.epg_id);
    if (p) {
      dom.osdEpgTitle.textContent = p.title;
      dom.osdEpgTime.textContent = `${formatTime(p.start)} - ${formatTime(p.stop)}`;
      dom.osdEpgNow.classList.remove('hidden');
      dom.osdProgressBar.classList.remove('hidden');
      const progress = getProgressPercent(p.start, p.stop);
      dom.osdProgressFill.style.width = `${progress}%`;
    } else {
      dom.osdEpgNow.classList.add('hidden');
      dom.osdProgressBar.classList.add('hidden');
    }
  } else {
    dom.osdEpgNow.classList.add('hidden');
    dom.osdProgressBar.classList.add('hidden');
  }

  dom.osdBanner.classList.remove('hidden');
  if (state.osdTimeout) clearTimeout(state.osdTimeout);
  state.osdTimeout = setTimeout(() => {
    dom.osdBanner.classList.add('hidden');
  }, 5000);
}

// Details Panel & EPG Update
function updateDetailsPanel(channel) {
  dom.detailName.textContent = channel.name;
  dom.detailSub.textContent = `${channel.group || 'Live'} • Canal ${state.filteredChannels.indexOf(channel) + 1}`;
  dom.detailLogo.src = channel.logo || (channel.is_radio ? 'logos/discomix.png' : 'logos/acasa4k.png');
  dom.badgeTechRes.textContent = (channel.resolution || 'HD').toUpperCase();
  dom.pillChannel.textContent = `${channel.name} (${channel.group || 'Live'})`;

  updateLiveEpgUI();
}

function updateLiveEpgUI() {
  if (!state.currentChannel) return;
  const c = state.currentChannel;

  if (!c.is_radio && c.epg_id && state.epg[c.epg_id]) {
    const p = getCurrentEpg(c.epg_id);
    if (p) {
      dom.epgLiveTime.textContent = `${formatTime(p.start)} - ${formatTime(p.stop)}`;
      dom.epgLiveTitle.textContent = p.title;
      dom.epgLiveSynopsis.textContent = p.desc || 'Emisiune în direct';
      const pct = getProgressPercent(p.start, p.stop);
      dom.epgMeterFill.style.width = `${pct}%`;
      return;
    }
  }

  dom.epgLiveTime.textContent = 'LIVE';
  dom.epgLiveTitle.textContent = c.is_radio ? 'Emisie Radio Live Hi-Fi' : 'Transmisiune TV Live HD';
  dom.epgLiveSynopsis.textContent = 'Ghidul electronic este actualizat în timp real din stream.';
  dom.epgMeterFill.style.width = '100%';
}

// EPG Helpers
function getCurrentEpg(epgId) {
  const list = state.epg[epgId];
  if (!list || list.length === 0) return null;
  const now = Date.now();
  return list.find(p => p.start <= now && p.stop > now) || null;
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getProgressPercent(start, stop) {
  const now = Date.now();
  const total = stop - start;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / total) * 100)));
}

// Web Audio API Winamp Spectrum Visualizer
function startVisualizer() {
  if (state.isVisualizerRunning) return;
  state.isVisualizerRunning = true;

  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 256;
      state.audioSource = state.audioContext.createMediaElementSource(dom.video);
      state.audioSource.connect(state.analyser);
      state.analyser.connect(state.audioContext.destination);
    }
    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  } catch (e) {
    // Cross-origin audio or browser policy fallback to synth visualizer
  }

  drawVisualizerFrame();
}

function stopVisualizer() {
  state.isVisualizerRunning = false;
}

function drawVisualizerFrame() {
  if (!state.isVisualizerRunning) return;

  const canvas = dom.visualizerCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, width, height);

  const numBars = 48;
  const bufferLength = state.analyser ? state.analyser.frequencyBinCount : numBars;
  const dataArray = new Uint8Array(bufferLength);

  if (state.analyser) {
    state.analyser.getByteFrequencyData(dataArray);
  } else {
    // Simulated lively spectrum if AudioContext is blocked by cross-origin
    const time = Date.now() / 150;
    for (let i = 0; i < bufferLength; i++) {
      dataArray[i] = Math.max(10, Math.sin(time + i * 0.3) * 100 + Math.cos(time * 0.5 + i * 0.1) * 80 + 70);
    }
  }

  const barWidth = (width / numBars) - 3;
  const bottom = height - 10;

  for (let i = 0; i < numBars; i++) {
    const rawVal = dataArray[i] || 0;
    const barHeight = (rawVal / 255) * (height * 0.7);
    const x = i * (barWidth + 3);
    const y = bottom - barHeight;

    // Gradient styling
    const grad = ctx.createLinearGradient(0, bottom, 0, y);
    if (state.visualizerTheme === 'classic') {
      grad.addColorStop(0, '#00ff66');
      grad.addColorStop(0.6, '#ffff00');
      grad.addColorStop(1, '#ff0033');
    } else {
      grad.addColorStop(0, '#00e5ff');
      grad.addColorStop(0.5, '#7928ca');
      grad.addColorStop(1, '#ff007f');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Peak dot
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, Math.max(10, y - 4), barWidth, 2);
  }

  requestAnimationFrame(drawVisualizerFrame);
}

// UI Event Listeners
function setupEventListeners() {
  dom.btnModeTv.addEventListener('click', () => switchMode('tv'));
  dom.btnModeRadio.addEventListener('click', () => switchMode('radio'));

  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    dom.btnClearSearch.classList.toggle('hidden', !state.searchQuery);
    filterAndRenderChannels();
  });

  dom.btnClearSearch.addEventListener('click', () => {
    state.searchQuery = '';
    dom.searchInput.value = '';
    dom.btnClearSearch.classList.add('hidden');
    filterAndRenderChannels();
  });

  // Controls Tap/Click Toggle & Auto-Hide on Mobile/Desktop
  let controlsTimer = null;
  let controlsVisible = false;
  let lastToggleTime = 0;

  function showControls(autoHide = true) {
    controlsVisible = true;
    if (dom.playerControlsBar) dom.playerControlsBar.classList.add('visible');
    if (dom.playerWrapper) dom.playerWrapper.classList.add('show-controls');
    clearTimeout(controlsTimer);
    if (autoHide && !dom.video.paused) {
      controlsTimer = setTimeout(hideControls, 3500);
    }
  }

  function hideControls() {
    controlsVisible = false;
    if (dom.playerControlsBar) dom.playerControlsBar.classList.remove('visible');
    if (dom.playerWrapper) dom.playerWrapper.classList.remove('show-controls');
    clearTimeout(controlsTimer);
  }

  function toggleControls() {
    const now = Date.now();
    if (now - lastToggleTime < 250) return;
    lastToggleTime = now;

    if (controlsVisible) {
      hideControls();
    } else {
      showControls(true);
    }
  }

  // Tap or click on player background to toggle controls
  dom.playerWrapper.addEventListener('click', (e) => {
    if (e.target.closest('.player-controls-bar') || e.target.closest('.modal')) {
      return;
    }
    toggleControls();
  });

  // Only bind mousemove on desktop mice, preventing touchscreen synthetic mousemove
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    dom.playerWrapper.addEventListener('mousemove', () => {
      showControls(true);
    });

    dom.playerWrapper.addEventListener('mouseleave', () => {
      if (!dom.video.paused) {
        hideControls();
      }
    });
  }

  dom.btnPlayPause.addEventListener('click', () => {
    if (dom.video.paused) {
      dom.video.play();
      dom.btnPlayPause.textContent = '⏸';
      showControls(true);
    } else {
      dom.video.pause();
      dom.btnPlayPause.textContent = '▶';
      showControls(false);
    }
  });

  dom.btnPrev.addEventListener('click', playPreviousChannel);
  dom.btnNext.addEventListener('click', playNextChannel);

  // Volume & Mute Sync
  let lastVolume = 1;

  dom.volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    dom.video.volume = val;
    if (val === 0) {
      dom.video.muted = true;
      dom.btnMute.textContent = '🔇';
    } else {
      dom.video.muted = false;
      lastVolume = val;
      dom.btnMute.textContent = '🔊';
    }
  });

  dom.btnMute.addEventListener('click', () => {
    if (dom.video.muted || dom.video.volume === 0) {
      dom.video.muted = false;
      const restore = (lastVolume > 0) ? lastVolume : 1;
      dom.video.volume = restore;
      dom.volumeSlider.value = restore;
      dom.btnMute.textContent = '🔊';
    } else {
      lastVolume = dom.video.volume > 0 ? dom.video.volume : (lastVolume || 1);
      dom.video.muted = true;
      dom.volumeSlider.value = 0;
      dom.btnMute.textContent = '🔇';
    }
  });

  dom.btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      dom.playerWrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  dom.btnPip.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await dom.video.requestPictureInPicture();
      } else if (dom.video.webkitSupportsPresentationMode && typeof dom.video.webkitSetPresentationMode === 'function') {
        dom.video.webkitSetPresentationMode(dom.video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  });

  dom.video.addEventListener('waiting', () => dom.spinner.classList.remove('hidden'));
  dom.video.addEventListener('canplay', () => dom.spinner.classList.add('hidden'));
  dom.video.addEventListener('playing', () => {
    dom.spinner.classList.add('hidden');
    dom.btnPlayPause.textContent = '⏸';
    showControls(true);
  });
  dom.video.addEventListener('play', () => {
    dom.btnPlayPause.textContent = '⏸';
    showControls(true);
    if (state.currentChannel && !state.currentChannel.is_radio) {
      requestScreenWakeLock();
    }
  });
  dom.video.addEventListener('pause', () => {
    dom.btnPlayPause.textContent = '▶';
    showControls(false);
    releaseScreenWakeLock();
  });
  dom.video.addEventListener('ended', () => {
    dom.btnPlayPause.textContent = '▶';
    showControls(false);
    releaseScreenWakeLock();
  });
}

// Channel Hopping
function playNextChannel() {
  if (state.filteredChannels.length === 0) return;
  const currentIdx = state.filteredChannels.indexOf(state.currentChannel);
  const nextIdx = (currentIdx + 1) >= state.filteredChannels.length ? 0 : currentIdx + 1;
  playChannel(state.filteredChannels[nextIdx]);
  focusCard(nextIdx);
}

function playPreviousChannel() {
  if (state.filteredChannels.length === 0) return;
  const currentIdx = state.filteredChannels.indexOf(state.currentChannel);
  const prevIdx = (currentIdx - 1) < 0 ? state.filteredChannels.length - 1 : currentIdx - 1;
  playChannel(state.filteredChannels[prevIdx]);
  focusCard(prevIdx);
}

function focusCard(index) {
  state.focusedIndex = index;
  const cards = dom.channelsContainer.querySelectorAll('.channel-card');
  cards.forEach(c => c.classList.remove('focused'));
  if (cards[index]) {
    cards[index].classList.add('focused');
    cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Settings Modal & Persistence
function setupSettings() {
  dom.btnSettings.addEventListener('click', () => {
    dom.proxyModeSelect.value = state.proxyMode;
    dom.customProxyInput.value = state.customProxyUrl;
    dom.customProxyGroup.classList.toggle('hidden', state.proxyMode !== 'custom');
    dom.visThemeSelect.value = state.visualizerTheme;
    dom.settingsModal.classList.remove('hidden');
  });

  dom.btnCloseSettings.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));

  dom.proxyModeSelect.addEventListener('change', (e) => {
    dom.customProxyGroup.classList.toggle('hidden', e.target.value !== 'custom');
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    state.proxyMode = dom.proxyModeSelect.value;
    state.customProxyUrl = dom.customProxyInput.value.trim();
    state.visualizerTheme = dom.visThemeSelect.value;

    localStorage.setItem('flolite_proxy_mode', state.proxyMode);
    localStorage.setItem('flolite_custom_proxy', state.customProxyUrl);
    localStorage.setItem('flolite_vis_theme', state.visualizerTheme);

    dom.settingsModal.classList.add('hidden');
    if (state.currentChannel) {
      playChannel(state.currentChannel);
    }
  });
}

// Keyboard & TV Remote Control Navigation
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If typing in input, don't intercept navigation
    if (document.activeElement === dom.searchInput || document.activeElement === dom.customProxyInput) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    // Direct channel digits (0-9)
    if (e.key >= '0' && e.key <= '9') {
      state.numBuffer += e.key;
      clearTimeout(state.numBufferTimeout);
      dom.pillChannel.textContent = `Salt la canalul #${state.numBuffer}...`;
      state.numBufferTimeout = setTimeout(() => {
        const num = parseInt(state.numBuffer, 10);
        state.numBuffer = '';
        if (num > 0 && num <= state.filteredChannels.length) {
          playChannel(state.filteredChannels[num - 1]);
          focusCard(num - 1);
        }
      }, 1200);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (state.focusedIndex + 1 < state.filteredChannels.length) {
          focusCard(state.focusedIndex + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (state.focusedIndex - 1 >= 0) {
          focusCard(state.focusedIndex - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (state.filteredChannels[state.focusedIndex]) {
          playChannel(state.filteredChannels[state.focusedIndex]);
        }
        break;
      case 'PageDown':
      case 'ChannelDown':
        e.preventDefault();
        playNextChannel();
        break;
      case 'PageUp':
      case 'ChannelUp':
        e.preventDefault();
        playPreviousChannel();
        break;
      case ' ':
        e.preventDefault();
        dom.btnPlayPause.click();
        break;
      case 'f':
      case 'F':
        dom.btnFullscreen.click();
        break;
      case 'm':
      case 'M':
        dom.btnMute.click();
        break;
      case 'i':
      case 'I':
        if (state.currentChannel) showOsd(state.currentChannel);
        break;
      case '/':
        e.preventDefault();
        dom.searchInput.focus();
        break;
    }
  });
}

// Screen Wake Lock API (prevents display sleep during video playback)
let wakeLockSentinel = null;

async function requestScreenWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    }
  } catch (err) {
    console.log('Screen Wake Lock error or denied:', err);
  }
}

function releaseScreenWakeLock() {
  if (wakeLockSentinel !== null) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.currentChannel && !state.currentChannel.is_radio && !dom.video.paused) {
    requestScreenWakeLock();
  }
});

// MediaSession API (Lockscreen, Bluetooth & Android Auto integration)
function updateMediaSession(channel) {
  if ('mediaSession' in navigator && channel) {
    try {
      const logoUrl = channel.logo ? (window.location.origin + '/' + channel.logo) : (window.location.origin + '/logos/acasa4k.png');
      navigator.mediaSession.metadata = new MediaMetadata({
        title: channel.name,
        artist: channel.is_radio ? 'Radio Live • FloLite 3.0' : 'TV Live • FloLite 3.0',
        album: channel.group || 'FloLite Universal',
        artwork: [
          { src: logoUrl, sizes: '128x128', type: 'image/png' },
          { src: logoUrl, sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        dom.video.play().catch(() => {});
        dom.btnPlayPause.textContent = '⏸';
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        dom.video.pause();
        dom.btnPlayPause.textContent = '▶';
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => playPreviousChannel());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextChannel());
    } catch (e) {
      console.warn('MediaSession error:', e);
    }
  }
}

// Google Cast & Remote Playback
function setupCast() {
  if (dom.btnCast) {
    dom.btnCast.addEventListener('click', () => {
      if ('remote' in dom.video) {
        dom.video.remote.prompt().catch(err => {
          console.log('Remote playback prompt cancelled/failed:', err);
        });
      } else {
        alert("Pentru a transmite pe ecranul unui Smart TV sau Chromecast:\n1. În Google Chrome: deschide meniul ⋮ -> 'Cast / Transmite...'\n2. În Safari (iOS/Mac): folosește butonul AirPlay nativ.");
      }
    });
  }
}

// About Modal & Live Diagnostics
function setupAboutModal() {
  if (dom.btnAbout && dom.aboutModal) {
    dom.btnAbout.addEventListener('click', () => {
      const diagChannels = document.getElementById('diag-channels-count');
      if (diagChannels) diagChannels.textContent = `${state.channels.length} posturi TV & Radio`;

      const diagHls = document.getElementById('diag-hls-mode');
      if (diagHls) diagHls.textContent = window.Hls && Hls.isSupported() ? 'HLS.js Hardware Accelerated' : 'Native Browser HLS';

      const diagWake = document.getElementById('diag-wakelock');
      if (diagWake) diagWake.textContent = 'wakeLock' in navigator ? (wakeLockSentinel ? 'Activ (Ecran blocat aprins)' : 'Suportat (Standby)') : 'Nesuportat pe acest browser';

      const diagMedia = document.getElementById('diag-mediasession');
      if (diagMedia) diagMedia.textContent = 'mediaSession' in navigator ? 'Activ (Integrare mașină & lockscreen)' : 'Nesuportat';

      const diagProxy = document.getElementById('diag-proxy-status');
      if (diagProxy) {
        diagProxy.textContent = state.proxyMode === 'auto' ? 'Automat (Cloudflare Functions / Native)' : `Mod ${state.proxyMode.toUpperCase()}`;
      }

      dom.aboutModal.classList.remove('hidden');
    });

    if (dom.btnCloseAbout) {
      dom.btnCloseAbout.addEventListener('click', () => dom.aboutModal.classList.add('hidden'));
    }
    if (dom.btnAboutClose) {
      dom.btnAboutClose.addEventListener('click', () => dom.aboutModal.classList.add('hidden'));
    }

    dom.aboutModal.addEventListener('click', (e) => {
      if (e.target === dom.aboutModal) dom.aboutModal.classList.add('hidden');
    });
  }
}

// Start
init();
