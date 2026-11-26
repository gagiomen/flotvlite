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
  currentMode: 'tv', // 'tv', 'radio', or 'vod'
  currentCategory: 'TOATE',
  searchQuery: '',
  filteredChannels: [],
  currentChannel: null,
  lastTvChannel: null,
  lastRadioChannel: null,
  focusedIndex: 0,
  proxyMode: localStorage.getItem('flolite_proxy_mode') || 'auto',
  customProxyUrl: localStorage.getItem('flolite_custom_proxy') || '',
  aspectRatio: localStorage.getItem('flolite_aspect_ratio') || 'contain',
  isStatsVisible: false,
  statsInterval: null,
  aspectToastTimeout: null,
  hls: null,
  mpegts: null,
  osdTimeout: null,
  numBuffer: '',
  numBufferTimeout: null,
  // VOD State
  cartoonixCatalog: [],
  cinepubCatalog: [],
  vodLoaded: false,
  activeVodPlatform: 'cartoonix', // 'cartoonix' or 'cinepub'
  currentVodCategory: 'Toate',
  vodSearchQuery: '',
  currentVodShow: null,
  currentVodEpisode: null,
  currentVodMovie: null,
  isVodPlaying: false
};

const CARTOONIX_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlOTk4M2UxNS0yZWIwLTQxNWQtODFlMS1jZGFmYTQxZGVjNmQiLCJlbWFpbCI6ImN4dXNlcl8xNzk0ODcwNzEyQGZsZHViYWkuY29tIiwiZXhwIjoxNzk1NDc1NTE4LCJ0eXBlIjoiYWNjZXNzIn0.mh07RK75jF2zb1l9KdVvsBHSusfoGfD0hgEgFvzMMbo";

// DOM References
const dom = {
  mainContent: document.getElementById('main-content'),
  playerSection: document.getElementById('player-section'),
  video: document.getElementById('video-player'),
  youtubePlayer: document.getElementById('youtube-player'),
  playerWrapper: document.getElementById('player-wrapper'),
  vodTheatreBar: document.getElementById('vod-theatre-bar'),
  btnVodBackCatalog: document.getElementById('btn-vod-back-catalog'),
  vodTheatreBadge: document.getElementById('vod-theatre-badge'),
  vodTheatreTitle: document.getElementById('vod-theatre-title'),
  btnVodPrevEp: document.getElementById('btn-vod-prev-ep'),
  btnVodNextEp: document.getElementById('btn-vod-next-ep'),
  btnVodClosePlayer: document.getElementById('btn-vod-close-player'),
  playerControlsBar: document.querySelector('.player-controls-bar'),
  radioBackdrop: document.getElementById('radio-backdrop'),
  radioLogo: document.getElementById('radio-logo'),
  radioName: document.getElementById('radio-name'),
  radioGenre: document.getElementById('radio-genre'),
  aspectToast: document.getElementById('aspect-toast'),
  statsOverlay: document.getElementById('stats-overlay'),
  btnCloseStats: document.getElementById('btn-close-stats'),
  statChannel: document.getElementById('stat-channel'),
  statEngine: document.getElementById('stat-engine'),
  statResolution: document.getElementById('stat-resolution'),
  statViewport: document.getElementById('stat-viewport'),
  statAspect: document.getElementById('stat-aspect'),
  statBuffer: document.getElementById('stat-buffer'),
  statBitrate: document.getElementById('stat-bitrate'),
  statFrames: document.getElementById('stat-frames'),
  statNetwork: document.getElementById('stat-network'),
  statAudio: document.getElementById('stat-audio'),
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
  epgNextItem: document.getElementById('epg-next-item'),
  epgNextTime: document.getElementById('epg-next-time'),
  epgNextTitle: document.getElementById('epg-next-title'),
  categoriesBar: document.getElementById('categories-bar'),
  channelsContainer: document.getElementById('channels-container'),
  channelsSection: document.getElementById('channels-section'),
  channelCounter: document.getElementById('channel-counter'),
  btnModeTv: document.getElementById('btn-mode-tv'),
  btnModeRadio: document.getElementById('btn-mode-radio'),
  btnModeVod: document.getElementById('btn-mode-vod'),
  vodSection: document.getElementById('vod-section'),
  vodNowWatchingBar: document.getElementById('vod-now-watching-bar'),
  nowWatchingTitle: document.getElementById('now-watching-title'),
  btnScrollToPlayer: document.getElementById('btn-scroll-to-player'),
  tabVodCartoonix: document.getElementById('tab-vod-cartoonix'),
  tabVodCinepub: document.getElementById('tab-vod-cinepub'),
  vodSearchInput: document.getElementById('vod-search-input'),
  btnClearVodSearch: document.getElementById('btn-clear-vod-search'),
  vodCategoriesBar: document.getElementById('vod-categories-bar'),
  vodGridContainer: document.getElementById('vod-grid-container'),
  vodModal: document.getElementById('vod-modal'),
  vodModalTitle: document.getElementById('vod-modal-title'),
  vodModalBody: document.getElementById('vod-modal-body'),
  btnCloseVodModal: document.getElementById('btn-close-vod-modal'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnMute: document.getElementById('btn-mute'),
  volumeSlider: document.getElementById('volume-slider'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  btnPip: document.getElementById('btn-pip'),
  btnServer: document.getElementById('btn-server'),
  btnAudioTrack: document.getElementById('btn-audio-track'),
  btnSubtitles: document.getElementById('btn-subtitles'),
  trackPickerMenu: document.getElementById('track-picker-menu'),
  trackPickerTitle: document.getElementById('track-picker-title'),
  trackPickerList: document.getElementById('track-picker-list'),
  btnCloseTrackPicker: document.getElementById('btn-close-track-picker'),
  btnAspect: document.getElementById('btn-aspect'),
  btnStats: document.getElementById('btn-stats'),
  btnAbout: document.getElementById('btn-about'),
  aboutModal: document.getElementById('about-modal'),
  btnCloseAbout: document.getElementById('btn-close-about'),
  btnAboutClose: document.getElementById('btn-about-close'),
  btnEpgGuide: document.getElementById('btn-epg-guide'),
  btnPlayerEpg: document.getElementById('btn-player-epg'),
  btnDetailsEpg: document.getElementById('btn-details-epg'),
  epgModal: document.getElementById('epg-modal'),
  btnCloseEpgModal: document.getElementById('btn-close-epg-modal'),
  epgSyncStatus: document.getElementById('epg-sync-status'),
  epgTabChannels: document.getElementById('epg-tab-channels'),
  epgTabSchedule: document.getElementById('epg-tab-schedule'),
  epgSearchInput: document.getElementById('epg-search-input'),
  btnClearEpgSearch: document.getElementById('btn-clear-epg-search'),
  epgGuideBody: document.getElementById('epg-guide-body'),
  epgChannelsPane: document.getElementById('epg-channels-pane'),
  epgSchedulePane: document.getElementById('epg-schedule-pane'),
  btnEpgBackChannels: document.getElementById('btn-epg-back-channels'),
  epgHeroLogo: document.getElementById('epg-hero-logo'),
  epgHeroName: document.getElementById('epg-hero-name'),
  epgHeroGroup: document.getElementById('epg-hero-group'),
  btnEpgWatch: document.getElementById('btn-epg-watch'),
  epgDayFilters: document.getElementById('epg-day-filters'),
  epgTimelineList: document.getElementById('epg-timeline-list'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  proxyModeSelect: document.getElementById('proxy-mode-select'),
  customProxyGroup: document.getElementById('custom-proxy-group'),
  customProxyInput: document.getElementById('custom-proxy-url')
};

// Initialize Application
async function init() {
  setupEventListeners();
  setupSettings();
  setupAboutModal();
  setupEpgGuide();
  applyAspectRatio(state.aspectRatio, false);
  setupKeyboardShortcuts();

  // Load Channels & EPG
  try {
    let cachedEpg = null;
    try {
      const localEpgStr = localStorage.getItem('flolite_epg_cache');
      if (localEpgStr) {
        cachedEpg = JSON.parse(localEpgStr);
      }
    } catch (e) {}

    const [channelsRes, epgRes] = await Promise.all([
      fetch('channels.json').then(r => r.json()),
      cachedEpg ? Promise.resolve(cachedEpg) : fetch('epg_initial.json').then(r => r.json()).catch(() => ({}))
    ]);

    state.channels = channelsRes;
    state.tvChannels = channelsRes.filter(c => !c.is_radio);
    state.radioChannels = channelsRes.filter(c => c.is_radio);
    state.epg = (cachedEpg && Object.keys(cachedEpg).length > 0) ? cachedEpg : (epgRes || {});

    // Restore last mode & last played channel
    const savedMode = localStorage.getItem('flolite_last_mode') || 'tv';
    switchMode(savedMode, true);

    // Periodic EPG progress tick (every 30 seconds)
    setInterval(updateLiveEpgUI, 30000);

    // Background fresh EPG network sync
    setTimeout(syncEpgFromNetwork, 4000);
  } catch (err) {
    console.error('Eroare la incarcarea datelor:', err);
    alert('Eroare la incarcarea canalelor. Verifica conexiunea la server.');
  }
}

// Switch Mode (TV / Radio / VOD)
function switchMode(mode, playTarget = true) {
  state.currentMode = mode;
  localStorage.setItem('flolite_last_mode', mode);

  if (mode === 'vod') {
    if (dom.mainContent) {
      dom.mainContent.classList.add('mode-vod');
      dom.mainContent.classList.remove('mode-tv', 'mode-radio');
    }

    dom.btnModeVod.classList.add('active');
    dom.btnModeTv.classList.remove('active');
    dom.btnModeRadio.classList.remove('active');

    dom.channelsSection.classList.add('hidden');
    dom.vodSection.classList.remove('hidden');

    // Pause any live TV or Radio stream
    destroyActivePlayers();
    dom.video.pause();
    dom.radioBackdrop.classList.add('hidden');

    // If not actively playing a VOD title, hide player section so catalog is 100% full width
    if (!state.isVodPlaying) {
      if (dom.playerSection) dom.playerSection.classList.add('hidden');
      if (dom.mainContent) dom.mainContent.classList.remove('vod-playing');
      if (dom.vodTheatreBar) dom.vodTheatreBar.classList.add('hidden');
      if (dom.vodNowWatchingBar) dom.vodNowWatchingBar.classList.add('hidden');
    } else {
      if (dom.playerSection) dom.playerSection.classList.remove('hidden');
      if (dom.mainContent) dom.mainContent.classList.add('vod-playing');
      if (dom.vodTheatreBar) dom.vodTheatreBar.classList.remove('hidden');
      if (dom.vodNowWatchingBar) dom.vodNowWatchingBar.classList.remove('hidden');
    }

    loadAndRenderVod();
    return;
  }

  // TV or Radio mode
  if (dom.mainContent) {
    dom.mainContent.classList.remove('mode-vod', 'vod-playing');
    dom.mainContent.classList.add(mode === 'tv' ? 'mode-tv' : 'mode-radio');
  }

  if (dom.vodTheatreBar) dom.vodTheatreBar.classList.add('hidden');
  if (dom.vodNowWatchingBar) dom.vodNowWatchingBar.classList.add('hidden');
  dom.vodSection.classList.add('hidden');
  if (dom.playerSection) dom.playerSection.classList.remove('hidden');
  dom.channelsSection.classList.remove('hidden');

  // Stop any active VOD YouTube iframe
  if (dom.youtubePlayer) {
    dom.youtubePlayer.src = '';
    dom.youtubePlayer.classList.add('hidden');
  }
  state.isVodPlaying = false;

  state.currentCategory = 'TOATE';

  if (mode === 'tv') {
    dom.btnModeTv.classList.add('active');
    dom.btnModeRadio.classList.remove('active');
    dom.btnModeVod.classList.remove('active');
  } else {
    dom.btnModeRadio.classList.add('active');
    dom.btnModeTv.classList.remove('active');
    dom.btnModeVod.classList.remove('active');
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

// Favorites Management
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('flolite_favorites')) || [];
  } catch (e) {
    return [];
  }
}

function isFavorite(channelId) {
  return getFavorites().includes(channelId);
}

function toggleFavorite(channelId) {
  let favs = getFavorites();
  if (favs.includes(channelId)) {
    favs = favs.filter(id => id !== channelId);
  } else {
    favs.push(channelId);
  }
  localStorage.setItem('flolite_favorites', JSON.stringify(favs));
  return favs.includes(channelId);
}

function normalizeCategory(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Category Icon Resolver
function getCategoryIcon(cat, mode) {
  const norm = normalizeCategory(cat);
  if (norm === 'favorite' || norm === 'favorit') return '⭐';
  if (norm === 'toate') return mode === 'tv' ? '✨' : '📻';
  if (norm.includes('general')) return '📡';
  if (norm.includes('stiri')) return '📰';
  if (norm.includes('sport')) return '⚽';
  if (norm.includes('film') || norm.includes('cinema') || norm.includes('hbo')) return '🎬';
  if (norm.includes('doc')) return '🦁';
  if (norm.includes('folclor')) return '🎻';
  if (norm.includes('muzic') || norm.includes('music')) return '🎵';
  if (norm.includes('cartoonix')) return '👶';
  if (norm.includes('desene') || norm.includes('copii') || norm.includes('kids') || norm.includes('animat')) return '🧸';
  if (norm.includes('4k') || norm.includes('uhd')) return '💎';
  if (norm.includes('adult')) return '🔞';
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
  let categories = [];
  if (state.currentMode === 'tv') {
    // Exact requested order: Favorite, Toate, 4K, Generaliste, Stiri, Sport, Filme, Documentare, Desene animate, Cartoonix Live, Muzica, Muzica folclorica, Moldova, Adult
    categories = [
      'Favorite',
      'Toate',
      '4K',
      'Generaliste',
      'Știri',
      'Sport',
      'Filme',
      'Documentare',
      'Desene animate',
      'Cartoonix Live',
      'Muzică',
      'Muzica Folclorica',
      'Moldova',
      'Adult'
    ];
  } else {
    const radioGroups = new Set();
    state.radioChannels.forEach(c => {
      let grp = (c.group || 'Altele').replace('Radio - ', '').replace('Romania', 'România').trim();
      radioGroups.add(grp);
    });
    const sortedRadioGroups = Array.from(radioGroups).sort((a, b) => a.localeCompare(b, 'ro'));
    categories = ['Favorite', 'Toate', ...sortedRadioGroups];
  }

  // Ensure current category is valid
  const validNorms = categories.map(c => normalizeCategory(c));
  if (!validNorms.includes(normalizeCategory(state.currentCategory))) {
    state.currentCategory = 'Toate';
  }

  dom.categoriesBar.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    const isActive = normalizeCategory(cat) === normalizeCategory(state.currentCategory);
    chip.className = `category-chip ${isActive ? 'active' : ''}`;
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
  const currentCatNorm = normalizeCategory(state.currentCategory);
  const favList = getFavorites();

  state.filteredChannels = sourceList.filter(c => {
    const channelGroupNorm = normalizeCategory(c.group);

    // 1. Favorite Category Filter
    if (currentCatNorm === 'favorite' || currentCatNorm === 'favorit') {
      if (!favList.includes(c.id)) {
        return false;
      }
    }
    // 2. Toate Category Filter: ELIMINATE Adult channels!
    else if (currentCatNorm === 'toate') {
      if (channelGroupNorm.includes('adult')) {
        return false; // Adult channels are excluded from Toate!
      }
    }
    // 3. Adult Category Filter
    else if (currentCatNorm === 'adult') {
      if (!channelGroupNorm.includes('adult')) {
        return false;
      }
    }
    // 3b. Cartoonix Live Category Filter
    else if (currentCatNorm.includes('cartoonix')) {
      if (!channelGroupNorm.includes('cartoonix') && !(c.url && c.url.startsWith('cartoonix://'))) {
        return false;
      }
    }
    // 3c. Desene Animate (includes standard Desene + Cartoonix)
    else if (currentCatNorm.includes('desene') || currentCatNorm.includes('copii')) {
      if (!channelGroupNorm.includes('desene') && !channelGroupNorm.includes('copii') && !channelGroupNorm.includes('cartoonix') && !(c.url && c.url.startsWith('cartoonix://'))) {
        return false;
      }
    }
    // 4. Specific Category Match
    else {
      if (channelGroupNorm !== currentCatNorm && !channelGroupNorm.includes(currentCatNorm) && !currentCatNorm.includes(channelGroupNorm)) {
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

  if (state.filteredChannels.length === 0) {
    if (currentCatNorm === 'favorite' || currentCatNorm === 'favorit') {
      dom.channelsContainer.innerHTML = `
        <div class="empty-favorites-box">
          <span class="empty-fav-icon">⭐</span>
          <h3>Niciun canal la Favorite</h3>
          <p>Apasă pe steluța ☆ de pe orice canal pentru a-l salva în lista ta de favorite!</p>
        </div>
      `;
      return;
    } else {
      dom.channelsContainer.innerHTML = `
        <div class="empty-favorites-box">
          <span class="empty-fav-icon">🔍</span>
          <h3>Niciun rezultat găsit</h3>
          <p>Nu există canale care să corespundă căutării în această categorie.</p>
        </div>
      `;
      return;
    }
  }

  state.filteredChannels.forEach((c, index) => {
    const card = document.createElement('div');
    const isPlaying = state.currentChannel && state.currentChannel.id === c.id;
    const isFav = favList.includes(c.id);

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
      <button class="btn-fav-star ${isFav ? 'active' : ''}" title="${isFav ? 'Elimină din Favorite' : 'Adaugă la Favorite'}" aria-label="Favorite">
        ${isFav ? '★' : '☆'}
      </button>
    `;

    // Star Click: Toggle Favorite
    const starBtn = card.querySelector('.btn-fav-star');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowFav = toggleFavorite(c.id);
        starBtn.classList.toggle('active', nowFav);
        starBtn.textContent = nowFav ? '★' : '☆';
        starBtn.title = nowFav ? 'Elimină din Favorite' : 'Adaugă la Favorite';

        if (currentCatNorm === 'favorite' || currentCatNorm === 'favorit') {
          filterAndRenderChannels();
        }
      });
    }

    card.addEventListener('click', () => {
      playChannel(c);
      focusCard(index);
    });

    dom.channelsContainer.appendChild(card);
  });
}

// Direct CORS-capable official CDNs (when no custom Referer is required)
function isCorsDirectCdn(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith('https://')) return false;
  return /\/\/([^/]+\.)?((?:live77cdn2|live3vox)\.antenaplay\.ro|lg\.mncdn\.com|kanald\.ro|rcs-rds\.ro|tv\.broadcasting\.ro|trm\.md|a7tvlive\.ro|senstv\.ro|livemetropolatv\.ro|tvboom\.ro|streamlock\.net|enhanced\.live|lotus\.stingray\.com|dash4\.antik\.sk|akamaized\.net|cloudfront\.net|wurl\.com|cinerama\.uz|privesc\.eu|realitatea\.net|romaniatv\.net|streamnet\.ro|streamnet\.pro|jstre\.am|dai\.google\.com|streamw\.m\.ro|streams\.radiozum\.md|moldovatv\.ro|rundle\.tv|3qsdn\.com|tvimpact\.live)\b/i.test(rawUrl);
}

function isCanaleTvBlockedOnCf(rawUrl) {
  if (!rawUrl) return false;
  return /\.(shop|cfd|pw|space)\//i.test(rawUrl);
}

function destroyActivePlayers() {
  if (state.hls) {
    try { state.hls.destroy(); } catch (_) {}
    state.hls = null;
  }
  if (state.mpegts) {
    try {
      state.mpegts.pause();
      state.mpegts.unload();
      state.mpegts.detachMediaElement();
      state.mpegts.destroy();
    } catch (_) {}
    state.mpegts = null;
  }
}

function isBrowserHlsUrl(rawUrl) {
  if (!rawUrl) return false;
  return /\.(m3u8|htm)(\?|$)|\/usergen|^cartoonix:\/\//i.test(rawUrl);
}

function isMpegTsHbbtvUrl(rawUrl) {
  if (!rawUrl) return false;
  return /rpprod\.hbbtv\.cdn\.cra\.cz/i.test(rawUrl);
}

function getEffectiveStreams(channel) {
  const list = (channel.streams && channel.streams.length > 0)
    ? channel.streams
    : [{ name: 'Server 1', url: channel.url, resolution: channel.resolution, headers: channel.headers || {} }];
  const hasMpegTs = Boolean(window.mpegts && mpegts.isSupported());
  let hlsOrdered = list;
  if (!channel.is_radio && list.length > 1) {
    const playable = list.filter(s => isBrowserHlsUrl(s.url) || (hasMpegTs && isMpegTsHbbtvUrl(s.url)));
    hlsOrdered = playable.length > 0 ? playable : list;
  }
  // Prefer rundle-compatible / CORS-open / sslip-capable streams, omitting dokagents on remote HTTPS when working HLS exists
  const isRemoteHttps = window.location.protocol === 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isRemoteHttps && hlsOrdered.length > 1) {
    const nonDok = hlsOrdered.filter(s => !(s.url && s.url.includes('dokagents.site')));
    if (nonDok.length > 0) return nonDok;
  }
  return hlsOrdered;
}

// Resolve Proxy URL
function resolveStreamUrl(channel, streamObj, forceProxy = false) {
  const s = streamObj || ((channel.streams && channel.streams.length > 0) ? channel.streams[0] : null);
  let rawUrl = (s && s.url) ? s.url : channel.url;
  if (!rawUrl) return '';

  const hdrs = (s && s.headers && Object.keys(s.headers).length > 0) ? s.headers : (channel.headers || {});
  let referer = hdrs.Referer || hdrs['http-referrer'] || '';
  if (!referer && isCanaleTvBlockedOnCf(rawUrl)) {
    referer = 'https://canale-tv.net/';
  }

  // Proxy decision
  if (state.proxyMode === 'direct') {
    return rawUrl;
  }

  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Bypass Cloudflare Worker 403 block on canale-tv domains via CORS-open rundle.tv relay when on remote web
  if (!forceProxy && !isLocalHost && isCanaleTvBlockedOnCf(rawUrl) && state.proxyMode !== 'custom') {
    return `https://rundle.tv/proxy5.php?src=${encodeURIComponent(rawUrl)}`;
  }

  if (!forceProxy && !referer && isCorsDirectCdn(rawUrl) && (state.proxyMode === 'auto' || state.proxyMode === 'relative')) {
    return rawUrl;
  }

  const refSuffix = referer ? `&ref=${encodeURIComponent(referer)}` : '';

  if (state.proxyMode === 'custom' && state.customProxyUrl) {
    const base = state.customProxyUrl.endsWith('=') ? state.customProxyUrl : state.customProxyUrl + '?url=';
    return `${base}${encodeURIComponent(rawUrl)}${refSuffix}`;
  }

  // Relative / Auto: Use relative /proxy?url= (includes sslip.io raw-IP bypass & radiozu resolver on Cloudflare Pages)
  if (state.proxyMode === 'relative' || state.proxyMode === 'auto') {
    return `/proxy?url=${encodeURIComponent(rawUrl)}${refSuffix}`;
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

  // Reset YouTube iframe if active
  if (dom.youtubePlayer) {
    dom.youtubePlayer.src = '';
    dom.youtubePlayer.classList.add('hidden');
  }
  dom.video.classList.remove('hidden');

  dom.spinner.classList.remove('hidden');
  updateDetailsPanel(channel);
  showOsd(channel);
  if (channel._manualFallbackMsg && dom.osdEpgTitle && dom.osdEpgNow) {
    dom.osdEpgTitle.textContent = channel._manualFallbackMsg;
    dom.osdEpgNow.classList.remove('hidden');
    channel._manualFallbackMsg = '';
  }

  // Update active state in list
  document.querySelectorAll('.channel-card').forEach(el => el.classList.remove('active'));
  const card = dom.channelsContainer.querySelector(`.channel-card[data-index="${state.filteredChannels.indexOf(channel)}"]`);
  if (card) card.classList.add('active');

  updateMediaSession(channel);

  if (channel.is_radio) {
    releaseScreenWakeLock();
    dom.radioBackdrop.classList.remove('hidden');
    dom.radioName.textContent = channel.name;
    dom.radioGenre.textContent = channel.group || 'Radio Live HD';
    dom.radioLogo.src = channel.logo || 'logos/discomix.png';
  } else {
    requestScreenWakeLock();
    dom.radioBackdrop.classList.add('hidden');
  }

  // Destroy previous HLS / MPEG-TS player & reset HTMLMediaElement
  destroyActivePlayers();
  dom.video.onerror = null;
  dom.video.pause();
  dom.video.removeAttribute('src');
  dom.video.load();

  const effStreams = getEffectiveStreams(channel);
  if (typeof channel._activeStreamIdx !== 'number') {
    const savedSrvUrl = localStorage.getItem('flolite_srv_url_' + channel.id);
    if (savedSrvUrl) {
      const savedIdx = effStreams.findIndex(s => s && s.url === savedSrvUrl);
      if (savedIdx >= 0) channel._activeStreamIdx = savedIdx;
    }
  }
  const startStreamIdx = (typeof channel._activeStreamIdx === 'number' && channel._activeStreamIdx < effStreams.length) ? channel._activeStreamIdx : 0;
  const activeStream = effStreams[startStreamIdx];
  const rawUrl = (activeStream && activeStream.url) ? activeStream.url : channel.url;
  const forceProxy = !!channel._forceProxyOnce;
  channel._forceProxyOnce = false;

  // Handle Cartoonix Live 24/7 Channels
  if (rawUrl && (rawUrl.startsWith('cartoonix://') || (channel.group && channel.group.toLowerCase() === 'cartoonix'))) {
    const channelKey = rawUrl.startsWith('cartoonix://') ? rawUrl.replace('cartoonix://', '') : '__all__';
    fetch(`https://cartoonix.ro/api/live/now?channel=${encodeURIComponent(channelKey)}`, {
      headers: {
        'Authorization': `Bearer ${CARTOONIX_BEARER_TOKEN}`
      }
    })
    .then(r => r.json())
    .then(json => {
      const cur = json.data && json.data.current ? json.data.current : (json.current || null);
      const offset = json.data && json.data.offset !== undefined ? json.data.offset : (json.offset || 0);
      if (cur && cur.video_url) {
        const streamUrl = 'https://cartoonix.ro/api' + encodeUriPath(cur.video_url);
        dom.video.src = streamUrl;
        dom.video.onloadedmetadata = () => {
          if (offset > 0 && offset < dom.video.duration) {
            dom.video.currentTime = offset;
          }
        };
        dom.video.play().catch(e => console.warn('Cartoonix play error:', e));
        dom.spinner.classList.add('hidden');
        dom.btnPlayPause.textContent = '⏸';
        if (cur.show_title) {
          dom.osdEpgTitle.textContent = `${cur.show_title} - ${cur.episode_title || ''}`;
          dom.osdEpgNow.classList.remove('hidden');
        }
      }
    })
    .catch(err => {
      console.warn('Cartoonix live fetch error:', err);
    });
    return;
  }

  const streamUrl = resolveStreamUrl(channel, activeStream, forceProxy);
  console.log(`[FloLiteTV] Redare ${channel.name} [S${startStreamIdx + 1}/${effStreams.length}] -> ${streamUrl}`);

  const advanceFallbackStream = () => {
    if (state.currentChannel !== channel) return;
    // If direct CDN or third-party relay failed, try our /proxy once for the same selected server
    if (!forceProxy && (streamUrl === rawUrl || streamUrl.includes('rundle.tv')) && state.proxyMode !== 'direct') {
      channel._forceProxyOnce = true;
      channel._activeStreamIdx = startStreamIdx;
      playChannel(channel);
      return;
    }
    const tried = channel._triedStreamsCount || 0;
    if (effStreams.length > 1 && tried < effStreams.length - 1) {
      channel._triedStreamsCount = tried + 1;
      const nextIdx = (startStreamIdx + 1) % effStreams.length;
      if (channel._manualStreamPick) {
        channel._manualStreamPick = false;
        channel._manualFallbackMsg = `Serverul S${startStreamIdx + 1} indisponibil — trec la S${nextIdx + 1}`;
      }
      channel._activeStreamIdx = nextIdx;
      playChannel(channel);
    } else {
      channel._triedStreamsCount = 0;
      channel._manualStreamPick = false;
      dom.spinner.classList.add('hidden');
    }
  };

  // Check MPEG-TS HbbTV (mpegts.js) vs HLS.js vs Native HTML5 Audio/Video
  // Note: Only use Hls.js for actual .m3u8 playlists. Direct MP3/AAC radio streams MUST play via native HTML5!
  const isMpegTs = !channel.is_radio && isMpegTsHbbtvUrl(rawUrl) && window.mpegts && mpegts.isSupported();
  const isHls = !isMpegTs && Boolean(rawUrl && (rawUrl.includes('.m3u8') || rawUrl.includes('playlist') || (!channel.is_radio && !rawUrl.includes('.mp4') && !rawUrl.includes('.mp3'))));

  if (isMpegTs) {
    const mpegtsPlayer = mpegts.createPlayer({
      type: 'mpegts',
      isLive: true,
      url: streamUrl
    }, {
      enableWorker: false,
      liveBufferLatencyChasing: false,
      stashInitialSize: 256
    });
    state.mpegts = mpegtsPlayer;
    mpegtsPlayer.attachMediaElement(dom.video);
    mpegtsPlayer.on(mpegts.Events.ERROR, (errType, errDetail) => {
      console.warn('[mpegts.js Error]', errType, errDetail);
      if (state.mpegts === mpegtsPlayer) {
        destroyActivePlayers();
        advanceFallbackStream();
      }
    });
    mpegtsPlayer.on(mpegts.Events.MEDIA_INFO, () => {
      channel._triedStreamsCount = 0;
      dom.spinner.classList.add('hidden');
      updateWebTrackControls(channel);
    });
    mpegtsPlayer.load();
    mpegtsPlayer.play().catch(() => {});
  } else if (isHls && window.Hls && Hls.isSupported()) {
    const isRelay = streamUrl.includes('rundle.tv');
    class AntenaFixLoader extends Hls.DefaultConfig.loader {
      load(context, config, callbacks) {
        const origOnSuccess = callbacks.onSuccess;
        callbacks.onSuccess = (response, stats, ctx, networkDetails) => {
          if (response && typeof response.data === 'string' && response.data.includes('livebalancer02.antenaplay.ro')) {
            response.data = response.data.replace(/https:\/\/livebalancer02\.antenaplay\.ro\//g, 'https://live77cdn2.antenaplay.ro/');
          }
          origOnSuccess(response, stats, ctx, networkDetails);
        };
        super.load(context, config, callbacks);
      }
    }
    const hls = new Hls({
      enableWorker: true,
      pLoader: AntenaFixLoader,
      startFragPrefetch: !isRelay,
      maxBufferLength: isRelay ? 16 : 25,
      maxMaxBufferLength: 45,
      maxBufferSize: 80 * 1000 * 1000,
      maxBufferHole: 0.8,
      backBufferLength: 20,
      liveSyncDurationCount: isRelay ? 1 : 2,
      liveMaxLatencyDurationCount: 6,
      liveDurationInfinity: true,
      lowLatencyMode: false,
      manifestLoadingTimeOut: isRelay ? 24000 : 12000,
      manifestLoadingMaxRetry: isRelay ? 2 : 3,
      manifestLoadingRetryDelay: 800,
      levelLoadingTimeOut: isRelay ? 24000 : 12000,
      levelLoadingMaxRetry: isRelay ? 2 : 3,
      levelLoadingRetryDelay: 800,
      fragLoadingTimeOut: isRelay ? 28000 : 16000,
      fragLoadingMaxRetry: isRelay ? 3 : 4,
      fragLoadingRetryDelay: 800,
      nudgeOffset: 0.2,
      nudgeMaxRetry: 10,
      autoStartLoad: true
    });

    state.hls = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(dom.video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      channel._triedStreamsCount = 0;
      dom.video.play().catch(() => {});
      dom.spinner.classList.add('hidden');
      updateWebTrackControls(channel);
    });

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
      const tracks = (data && data.audioTracks) || hls.audioTracks || [];
      if (tracks.length > 0) {
        const saved = localStorage.getItem('flolite_audio_' + channel.id);
        let targetIdx = saved !== null ? tracks.findIndex((t, i) => String(t.id ?? i) === saved || (t.lang && t.lang === saved)) : -1;
        if (targetIdx < 0) {
          targetIdx = tracks.findIndex(t => /^(ro|ron|rum)$/i.test(t.lang || '') || /rom[aâ]n/i.test(t.name || ''));
        }
        if (targetIdx >= 0 && hls.audioTrack !== targetIdx) {
          hls.audioTrack = targetIdx;
        }
      }
      updateWebTrackControls(channel);
    });

    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
      const tracks = (data && data.subtitleTracks) || hls.subtitleTracks || [];
      if (tracks.length > 0) {
        const saved = localStorage.getItem('flolite_sub_' + channel.id);
        if (saved === 'OFF') {
          hls.subtitleTrack = -1;
          hls.subtitleDisplay = false;
        } else if (saved !== null) {
          const idx = tracks.findIndex((t, i) => String(t.id ?? i) === saved || (t.lang && t.lang === saved));
          if (idx >= 0) {
            hls.subtitleTrack = idx;
            hls.subtitleDisplay = true;
          }
        }
      }
      updateWebTrackControls(channel);
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.details && /subtitle/i.test(data.details) && !data.fatal) return;
      if (data.fatal) {
        console.warn('[Hls.js Fatal Error]', data);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (data.response && (data.response.code === 403 || data.response.code === 404 || data.response.code === 502)) {
              hls.destroy();
              advanceFallbackStream();
              return;
            }
            console.log('[Hls.js] Eroare retea, reincercare automata...');
            hls.destroy();
            advanceFallbackStream();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('[Hls.js] Eroare media, recuperare decodor...');
            hls.recoverMediaError();
            break;
          default:
            console.error('[Hls.js] Eroare irecuperabila:', data);
            hls.destroy();
            advanceFallbackStream();
            break;
        }
      } else if (data.details === 'bufferStalledError') {
        if (dom.video && !dom.video.paused && dom.video.currentTime > 0) {
          dom.video.currentTime += 0.05;
        }
      }
    });
  } else {
    // Native HTML5 Audio / Video (MP3 / AAC / Direct Audio Stream)
    dom.video.src = streamUrl;
    dom.video.onerror = () => advanceFallbackStream();
    const playPromise = dom.video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        channel._triedStreamsCount = 0;
        dom.spinner.classList.add('hidden');
      }).catch(err => {
        console.warn('Native play error / autoplay blocked:', err);
        dom.spinner.classList.add('hidden');
      });
    }
    dom.video.onloadeddata = () => { dom.spinner.classList.add('hidden'); updateWebTrackControls(channel); };
    dom.video.oncanplay = () => dom.spinner.classList.add('hidden');
  }

  updateWebTrackControls(channel);
  dom.btnPlayPause.textContent = '⏸';
}

function formatTrackLabelWeb(t, idx, kind) {
  const code = (t && (t.lang || t.language || '')).toLowerCase();
  const map = { ro: 'Română', ron: 'Română', rum: 'Română', en: 'Engleză', eng: 'Engleză', hu: 'Maghiară', hun: 'Maghiară', cs: 'Cehă', cze: 'Cehă', ces: 'Cehă', fr: 'Franceză', fre: 'Franceză', fra: 'Franceză', de: 'Germană', ger: 'Germană', deu: 'Germană', es: 'Spaniolă', spa: 'Spaniolă', it: 'Italiană', ita: 'Italiană', ru: 'Rusă', rus: 'Rusă' };
  const langName = map[code] || (code ? code.toUpperCase() : '');
  const rawName = (t && (t.name || t.label)) ? String(t.name || t.label).trim() : '';
  if (rawName && langName && !rawName.toLowerCase().includes(langName.toLowerCase())) return `${langName} — ${rawName}`;
  return rawName || langName || `${kind} ${idx + 1}`;
}

function getWebAudioTracks() {
  if (state.hls && state.hls.audioTracks && state.hls.audioTracks.length > 0) {
    return state.hls.audioTracks.map((t, i) => ({ idx: i, label: formatTrackLabelWeb(t, i, 'Audio'), active: state.hls.audioTrack === i, kind: 'hls', lang: t.lang || '' }));
  }
  if (dom.video && dom.video.audioTracks && dom.video.audioTracks.length > 0) {
    const out = [];
    for (let i = 0; i < dom.video.audioTracks.length; i++) {
      const t = dom.video.audioTracks[i];
      out.push({ idx: i, label: formatTrackLabelWeb(t, i, 'Audio'), active: !!t.enabled, kind: 'native', lang: t.language || '' });
    }
    return out;
  }
  return [];
}

function getWebSubtitleTracks() {
  if (state.hls && state.hls.subtitleTracks && state.hls.subtitleTracks.length > 0) {
    return state.hls.subtitleTracks.map((t, i) => ({ idx: i, label: formatTrackLabelWeb(t, i, 'Subtitrare'), active: state.hls.subtitleTrack === i, kind: 'hls', lang: t.lang || '' }));
  }
  if (dom.video && dom.video.textTracks && dom.video.textTracks.length > 0) {
    const out = [];
    for (let i = 0; i < dom.video.textTracks.length; i++) {
      const t = dom.video.textTracks[i];
      out.push({ idx: i, label: formatTrackLabelWeb(t, i, 'Subtitrare'), active: t.mode === 'showing', kind: 'native', lang: t.language || '' });
    }
    return out;
  }
  return [];
}

function updateWebTrackControls(channel) {
  if (!channel) return;
  const effStreams = getEffectiveStreams(channel);
  const activeSrvIdx = (typeof channel._activeStreamIdx === 'number' && channel._activeStreamIdx < effStreams.length) ? channel._activeStreamIdx : 0;
  if (dom.btnServer) {
    if (!channel.is_radio && effStreams.length > 1) {
      dom.btnServer.classList.remove('hidden');
      const resTag = (effStreams[activeSrvIdx] && effStreams[activeSrvIdx].resolution) || '';
      dom.btnServer.textContent = `S${activeSrvIdx + 1}${resTag ? ' ' + resTag : ''}`;
    } else {
      dom.btnServer.classList.add('hidden');
    }
  }
  const auds = getWebAudioTracks();
  if (dom.btnAudioTrack) {
    if (!channel.is_radio && auds.length > 0) {
      dom.btnAudioTrack.classList.remove('hidden');
      const act = auds.find(a => a.active);
      dom.btnAudioTrack.textContent = act ? `🎵 ${act.label.split(' ')[0]}` : '🎵 Audio';
    } else {
      dom.btnAudioTrack.classList.add('hidden');
    }
  }
  const subs = getWebSubtitleTracks();
  if (dom.btnSubtitles) {
    if (!channel.is_radio && subs.length > 0) {
      dom.btnSubtitles.classList.remove('hidden');
      const act = subs.find(s => s.active);
      dom.btnSubtitles.textContent = act ? `CC: ${act.label.split(' ')[0]}` : 'CC';
    } else {
      dom.btnSubtitles.classList.add('hidden');
    }
  }
}

function openWebTrackPicker(type) {
  const ch = state.currentChannel;
  if (!ch || !dom.trackPickerMenu || !dom.trackPickerList || !dom.trackPickerTitle) return;
  dom.trackPickerList.innerHTML = '';
  const closeMenu = () => {
    dom.trackPickerMenu.classList.add('hidden');
    if (typeof window.__floliteRefreshControlsTimer === 'function') {
      window.__floliteRefreshControlsTimer();
    }
  };

  if (type === 'server') {
    dom.trackPickerTitle.textContent = '🌐 Server Stream (RO / Rezoluție)';
    const effStreams = getEffectiveStreams(ch);
    const activeIdx = (typeof ch._activeStreamIdx === 'number' && ch._activeStreamIdx < effStreams.length) ? ch._activeStreamIdx : 0;
    effStreams.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'track-picker-item' + (i === activeIdx ? ' active' : '');
      btn.textContent = (i === activeIdx ? '✓ ' : '') + (s.name || `Server ${i + 1}`);
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        ch._activeStreamIdx = i;
        ch._triedStreamsCount = 0;
        ch._forceProxyOnce = false;
        ch._manualStreamPick = true;
        if (s && s.url) localStorage.setItem('flolite_srv_url_' + ch.id, s.url);
        closeMenu();
        playChannel(ch);
      };
      dom.trackPickerList.appendChild(btn);
    });
  } else if (type === 'audio') {
    dom.trackPickerTitle.textContent = '🎵 Alege Pistă Audio';
    const auds = getWebAudioTracks();
    auds.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'track-picker-item' + (a.active ? ' active' : '');
      btn.textContent = a.label;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (a.kind === 'hls' && state.hls) {
          state.hls.audioTrack = a.idx;
        } else if (dom.video && dom.video.audioTracks) {
          for (let j = 0; j < dom.video.audioTracks.length; j++) dom.video.audioTracks[j].enabled = (j === a.idx);
        }
        localStorage.setItem('flolite_audio_' + ch.id, a.lang || String(a.idx));
        updateWebTrackControls(ch);
        closeMenu();
      };
      dom.trackPickerList.appendChild(btn);
    });
  } else if (type === 'sub') {
    dom.trackPickerTitle.textContent = '💬 Alege Subtitrare';
    const subs = getWebSubtitleTracks();
    const offBtn = document.createElement('button');
    offBtn.className = 'track-picker-item' + (!subs.some(s => s.active) ? ' active' : '');
    offBtn.textContent = 'Dezactivat';
    offBtn.onclick = (e) => {
      e.stopPropagation();
      if (state.hls) { state.hls.subtitleTrack = -1; state.hls.subtitleDisplay = false; }
      if (dom.video && dom.video.textTracks) {
        for (let j = 0; j < dom.video.textTracks.length; j++) dom.video.textTracks[j].mode = 'disabled';
      }
      localStorage.setItem('flolite_sub_' + ch.id, 'OFF');
      updateWebTrackControls(ch);
      closeMenu();
    };
    dom.trackPickerList.appendChild(offBtn);
    subs.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'track-picker-item' + (s.active ? ' active' : '');
      btn.textContent = s.label;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (s.kind === 'hls' && state.hls) {
          state.hls.subtitleTrack = s.idx;
          state.hls.subtitleDisplay = true;
        } else if (dom.video && dom.video.textTracks) {
          for (let j = 0; j < dom.video.textTracks.length; j++) dom.video.textTracks[j].mode = (j === s.idx ? 'showing' : 'disabled');
        }
        localStorage.setItem('flolite_sub_' + ch.id, s.lang || String(s.idx));
        updateWebTrackControls(ch);
        closeMenu();
      };
      dom.trackPickerList.appendChild(btn);
    });
  }
  dom.trackPickerMenu.classList.remove('hidden');
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
    const nextP = getNextEpg(c.epg_id);

    if (p) {
      dom.epgLiveTime.textContent = `${formatTime(p.start)} - ${formatTime(p.stop)}`;
      dom.epgLiveTitle.textContent = p.title;
      dom.epgLiveSynopsis.textContent = p.desc || 'Emisiune în direct';
      const pct = getProgressPercent(p.start, p.stop);
      dom.epgMeterFill.style.width = `${pct}%`;

      if (dom.epgNextItem && nextP) {
        dom.epgNextItem.classList.remove('hidden');
        dom.epgNextTime.textContent = `${formatTime(nextP.start)} - ${formatTime(nextP.stop)}`;
        dom.epgNextTitle.textContent = nextP.title;
      } else if (dom.epgNextItem) {
        dom.epgNextItem.classList.add('hidden');
      }
      return;
    }
  }

  dom.epgLiveTime.textContent = 'LIVE';
  dom.epgLiveTitle.textContent = c.is_radio ? 'Emisie Radio Live Hi-Fi' : 'Transmisiune TV Live HD';
  dom.epgLiveSynopsis.textContent = c.is_radio ? 'Stream audio de înaltă fidelitate' : 'Program TV în direct';
  dom.epgMeterFill.style.width = '100%';
  if (dom.epgNextItem) dom.epgNextItem.classList.add('hidden');
}

// EPG Helpers
function getCurrentEpg(epgId) {
  const list = state.epg[epgId];
  if (!list || list.length === 0) return null;
  const now = Date.now();
  return list.find(p => p.start <= now && p.stop > now) || null;
}

function getNextEpg(epgId) {
  const list = state.epg[epgId];
  if (!list || list.length === 0) return null;
  const now = Date.now();
  let closest = null;
  for (const p of list) {
    if (p.start >= now) {
      if (!closest || p.start < closest.start) {
        closest = p;
      }
    }
  }
  return closest;
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

// Parse XMLTV date string e.g. "20261107221500 +0200" or "20261107201500 +0000"
function parseXmltvTimestamp(str) {
  if (!str || str.length < 14) return 0;
  const cleaned = str.trim();
  const y = cleaned.substring(0, 4);
  const m = cleaned.substring(4, 6);
  const d = cleaned.substring(6, 8);
  const h = cleaned.substring(8, 10);
  const min = cleaned.substring(10, 12);
  const s = cleaned.substring(12, 14);

  let tz = '+00:00';
  if (cleaned.length >= 20) {
    const rawTz = cleaned.substring(15, 20);
    tz = rawTz.substring(0, 3) + ':' + rawTz.substring(3, 5);
  }
  const iso = `${y}-${m}-${d}T${h}:${min}:${s}${tz}`;
  const parsed = Date.parse(iso);
  return isNaN(parsed) ? 0 : parsed;
}

// Background Network EPG Sync (uses gzip DecompressionStream & /proxy)
async function syncEpgFromNetwork() {
  try {
    const lastSync = parseInt(localStorage.getItem('flolite_epg_timestamp') || '0', 10);
    const now = Date.now();
    // Re-sync if older than 12 hours or empty
    if (now - lastSync < 12 * 3600 * 1000 && Object.keys(state.epg).length > 20) {
      return;
    }

    if (!window.DecompressionStream) {
      return;
    }

    const rawEpgUrl = 'https://epgshare01.online/epgshare01/epg_ripper_RO1.xml.gz';
    const proxyEpgUrl = resolveStreamUrl({ url: rawEpgUrl, headers: { Referer: 'https://epgshare01.online/' } });

    console.log('[FloLite EPG] Sincronizare ghid electronic în fundal...');
    const res = await fetch(proxyEpgUrl);
    if (!res.ok || !res.body) return;

    const ds = new DecompressionStream('gzip');
    const decompressedStream = res.body.pipeThrough(ds);
    const xmlText = await new Response(decompressedStream).text();

    const targetIds = new Set(state.tvChannels.map(c => c.epg_id).filter(Boolean));
    const newEpg = {};
    const minTime = now - (6 * 3600 * 1000);
    const maxTime = now + (48 * 3600 * 1000);

    const progRegex = /<programme\s+([^>]+)>([\s\S]*?)<\/programme>/g;
    const decodeXml = (str) => str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    let match;
    let count = 0;

    while ((match = progRegex.exec(xmlText)) !== null) {
      const attrs = match[1];
      const chM = attrs.match(/\bchannel="([^"]+)"/);
      if (!chM) continue;
      const chId = chM[1];
      if (!targetIds.has(chId)) continue;

      const startM = attrs.match(/\bstart="([^"]+)"/);
      const stopM = attrs.match(/\bstop="([^"]+)"/);
      if (!startM || !stopM) continue;

      const s = parseXmltvTimestamp(startM[1]);
      const e = parseXmltvTimestamp(stopM[1]);

      if (e >= minTime && s <= maxTime) {
        const inner = match[2];
        const titleM = inner.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const descM = inner.match(/<desc[^>]*>([\s\S]*?)<\/desc>/);
        const title = titleM ? decodeXml(titleM[1].replace(/<[^>]+>/g, '').trim()) : '';
        const desc = descM ? decodeXml(descM[1].replace(/<[^>]+>/g, '').trim()) : '';

        if (!newEpg[chId]) newEpg[chId] = [];
        newEpg[chId].push({ start: s, stop: e, title, desc });
        count++;
      }
    }

    if (Object.keys(newEpg).length > 20) {
      for (const cid in newEpg) {
        newEpg[cid].sort((a, b) => a.start - b.start);
      }
      state.epg = newEpg;
      try {
        localStorage.setItem('flolite_epg_cache', JSON.stringify(newEpg));
        localStorage.setItem('flolite_epg_timestamp', now.toString());
      } catch (storageErr) {
        console.warn('LocalStorage limit reached for EPG cache');
      }
      console.log(`[FloLite EPG] Actualizat cu succes: ${Object.keys(newEpg).length} canale, ${count} emisiuni.`);

      // Update UI
      updateLiveEpgUI();
      filterAndRenderChannels();
      if (state.currentChannel) showOsd(state.currentChannel);
      if (dom.epgModal && !dom.epgModal.classList.contains('hidden')) {
        updateEpgSyncBadge();
        renderEpgChannels();
        renderEpgSchedule();
      }
    }
  } catch (err) {
    console.warn('[FloLite EPG] Eroare sync fundal (non-fatal):', err);
  }
}

// Aspect Ratio Modes (Fit Original, Fill Screen, 16:9 Standard, 4:3 Retro, Zoom Crop)
const ASPECT_MODES = [
  { id: 'contain', label: 'Adaptat (Original Fit)', class: '' },
  { id: 'fill', label: 'Umplere Ecran (Fără tăiere)', class: 'aspect-fill' },
  { id: '16:9', label: 'Format TV 16:9', class: 'aspect-16-9' },
  { id: '4:3', label: 'Format Clasic 4:3', class: 'aspect-4-3' },
  { id: 'cover', label: 'Zoom Decupat (Crop sus/jos)', class: 'aspect-cover' }
];

function applyAspectRatio(modeId, showToast = true) {
  const mode = ASPECT_MODES.find(m => m.id === modeId) || ASPECT_MODES[0];
  state.aspectRatio = mode.id;
  localStorage.setItem('flolite_aspect_ratio', mode.id);

  ASPECT_MODES.forEach(m => {
    if (m.class) dom.video.classList.remove(m.class);
  });
  if (mode.class) {
    dom.video.classList.add(mode.class);
  }

  if (showToast && dom.aspectToast) {
    dom.aspectToast.textContent = `Raport: ${mode.label}`;
    dom.aspectToast.classList.remove('hidden');
    clearTimeout(state.aspectToastTimeout);
    state.aspectToastTimeout = setTimeout(() => {
      dom.aspectToast.classList.add('hidden');
    }, 2200);
  }

  if (state.isStatsVisible) {
    updateStatsHUD();
  }
}

function cycleAspectRatio() {
  const currentIdx = ASPECT_MODES.findIndex(m => m.id === state.aspectRatio);
  const nextIdx = (currentIdx + 1) % ASPECT_MODES.length;
  applyAspectRatio(ASPECT_MODES[nextIdx].id, true);
}

// Stats for Nerds (Statistici pentru pasionați) HUD
function toggleStatsHUD() {
  state.isStatsVisible = !state.isStatsVisible;
  if (dom.statsOverlay) {
    dom.statsOverlay.classList.toggle('hidden', !state.isStatsVisible);
  }
  if (state.isStatsVisible) {
    updateStatsHUD();
    clearInterval(state.statsInterval);
    state.statsInterval = setInterval(updateStatsHUD, 1000);
  } else {
    clearInterval(state.statsInterval);
    state.statsInterval = null;
  }
}

function updateStatsHUD() {
  if (!state.isStatsVisible) return;

  const c = state.currentChannel;
  if (dom.statChannel) {
    dom.statChannel.textContent = c ? `${c.name} [${c.group || 'Live'}]` : 'Niciun canal activ';
  }

  if (dom.statEngine) {
    if (c && c.is_radio) {
      dom.statEngine.textContent = 'HTML5 Audio (MP3/AAC Stream)';
    } else if (state.hls) {
      dom.statEngine.textContent = `HLS.js v${window.Hls && Hls.version ? Hls.version : '1.x'} (Worker Demuxer)`;
    } else {
      dom.statEngine.textContent = 'Native HTML5 Video Engine';
    }
  }

  const vw = dom.video.videoWidth;
  const vh = dom.video.videoHeight;
  if (dom.statResolution) {
    if (vw && vh) {
      dom.statResolution.textContent = `${vw} x ${vh}`;
    } else {
      dom.statResolution.textContent = c && c.is_radio ? 'Audio Only (Flux Radio)' : (c && c.resolution ? `${c.resolution.toUpperCase()} (Negociere)` : '--');
    }
  }

  if (dom.statViewport) {
    const rect = dom.video.getBoundingClientRect();
    dom.statViewport.textContent = `${Math.round(rect.width)} x ${Math.round(rect.height)} px`;
  }

  if (dom.statAspect) {
    const curMode = ASPECT_MODES.find(m => m.id === state.aspectRatio);
    dom.statAspect.textContent = curMode ? curMode.label : 'Adaptat (Original Fit)';
  }

  // Buffer health ahead
  if (dom.statBuffer) {
    if (dom.video.buffered && dom.video.buffered.length > 0) {
      const ct = dom.video.currentTime;
      let bufferAhead = 0;
      for (let i = 0; i < dom.video.buffered.length; i++) {
        if (dom.video.buffered.start(i) <= ct && ct <= dom.video.buffered.end(i)) {
          bufferAhead = dom.video.buffered.end(i) - ct;
          break;
        }
      }
      dom.statBuffer.textContent = `${bufferAhead.toFixed(1)} s`;
    } else {
      dom.statBuffer.textContent = '0.0 s';
    }
  }

  // Bitrate & Quality
  if (dom.statBitrate) {
    if (state.hls && state.hls.levels && state.hls.currentLevel >= 0) {
      const lvl = state.hls.levels[state.hls.currentLevel];
      const kbps = lvl && lvl.bitrate ? Math.round(lvl.bitrate / 1000) : 0;
      dom.statBitrate.textContent = `${lvl.height || ''}p @ ${kbps > 0 ? kbps + ' kbps' : 'Auto'}`;
    } else if (c && c.is_radio) {
      dom.statBitrate.textContent = '128 - 320 kbps (HQ Audio)';
    } else {
      dom.statBitrate.textContent = 'Auto / Direct Source';
    }
  }

  // Dropped video frames
  if (dom.statFrames) {
    if (dom.video.getVideoPlaybackQuality) {
      const q = dom.video.getVideoPlaybackQuality();
      const dropped = q.droppedVideoFrames || 0;
      const total = q.totalVideoFrames || 0;
      const pct = total > 0 ? ((dropped / total) * 100).toFixed(1) : 0;
      dom.statFrames.textContent = `${dropped} / ${total} (${pct}%)`;
    } else if (dom.video.webkitDroppedFrameCount !== undefined) {
      dom.statFrames.textContent = `${dom.video.webkitDroppedFrameCount} dropped`;
    } else {
      dom.statFrames.textContent = '0 / 0 (0%)';
    }
  }

  // Network / Proxy
  if (dom.statNetwork) {
    if (state.proxyMode === 'direct') {
      dom.statNetwork.textContent = 'Conexiune Directă (CORS permis)';
    } else if (state.proxyMode === 'custom') {
      dom.statNetwork.textContent = 'Custom Proxy Worker';
    } else {
      dom.statNetwork.textContent = 'Cloudflare Edge Function (/proxy)';
    }
  }

  // Audio level
  if (dom.statAudio) {
    const pct = Math.round(dom.video.volume * 100);
    dom.statAudio.textContent = dom.video.muted ? '0% (Muted)' : `${pct}%`;
  }
}

// UI Event Listeners
function setupEventListeners() {
  dom.btnModeTv.addEventListener('click', () => switchMode('tv'));
  dom.btnModeRadio.addEventListener('click', () => switchMode('radio'));
  if (dom.btnModeVod) {
    dom.btnModeVod.addEventListener('click', () => switchMode('vod'));
  }

  if (dom.tabVodCartoonix) {
    dom.tabVodCartoonix.addEventListener('click', () => {
      state.activeVodPlatform = 'cartoonix';
      state.currentVodCategory = 'Toate';
      renderVodUI();
    });
  }

  if (dom.tabVodCinepub) {
    dom.tabVodCinepub.addEventListener('click', () => {
      state.activeVodPlatform = 'cinepub';
      state.currentVodCategory = 'Toate';
      renderVodUI();
    });
  }

  if (dom.btnVodBackCatalog) {
    dom.btnVodBackCatalog.addEventListener('click', closeVodPlayer);
  }

  if (dom.btnVodClosePlayer) {
    dom.btnVodClosePlayer.addEventListener('click', closeVodPlayer);
  }

  if (dom.btnVodPrevEp) {
    dom.btnVodPrevEp.addEventListener('click', playPreviousVodEpisode);
  }

  if (dom.btnVodNextEp) {
    dom.btnVodNextEp.addEventListener('click', playNextVodEpisode);
  }

  if (dom.btnScrollToPlayer) {
    dom.btnScrollToPlayer.addEventListener('click', () => {
      if (dom.playerSection) {
        dom.playerSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (dom.vodSearchInput) {
    dom.vodSearchInput.addEventListener('input', (e) => {
      state.vodSearchQuery = e.target.value;
      if (dom.searchInput) dom.searchInput.value = e.target.value;
      if (dom.btnClearVodSearch) {
        dom.btnClearVodSearch.classList.toggle('hidden', !state.vodSearchQuery);
      }
      dom.btnClearSearch.classList.toggle('hidden', !state.vodSearchQuery);
      renderVodGrid();
    });
  }

  if (dom.btnClearVodSearch) {
    dom.btnClearVodSearch.addEventListener('click', () => {
      state.vodSearchQuery = '';
      dom.vodSearchInput.value = '';
      if (dom.searchInput) dom.searchInput.value = '';
      dom.btnClearVodSearch.classList.add('hidden');
      dom.btnClearSearch.classList.add('hidden');
      renderVodGrid();
    });
  }

  if (dom.btnCloseVodModal) {
    dom.btnCloseVodModal.addEventListener('click', closeVodModal);
  }

  if (dom.vodModal) {
    dom.vodModal.addEventListener('click', (e) => {
      if (e.target === dom.vodModal) closeVodModal();
    });
  }

  dom.searchInput.addEventListener('input', (e) => {
    if (state.currentMode === 'vod') {
      state.vodSearchQuery = e.target.value;
      if (dom.vodSearchInput) dom.vodSearchInput.value = e.target.value;
      if (dom.btnClearVodSearch) dom.btnClearVodSearch.classList.toggle('hidden', !state.vodSearchQuery);
      dom.btnClearSearch.classList.toggle('hidden', !state.vodSearchQuery);
      renderVodGrid();
      return;
    }
    state.searchQuery = e.target.value;
    dom.btnClearSearch.classList.toggle('hidden', !state.searchQuery);
    filterAndRenderChannels();
  });

  dom.btnClearSearch.addEventListener('click', () => {
    if (state.currentMode === 'vod') {
      state.vodSearchQuery = '';
      dom.searchInput.value = '';
      if (dom.vodSearchInput) dom.vodSearchInput.value = '';
      dom.btnClearSearch.classList.add('hidden');
      if (dom.btnClearVodSearch) dom.btnClearVodSearch.classList.add('hidden');
      renderVodGrid();
      return;
    }
    state.searchQuery = '';
    dom.searchInput.value = '';
    dom.btnClearSearch.classList.add('hidden');
    filterAndRenderChannels();
  });

  // Controls Tap/Click Toggle & Auto-Hide on Mobile/Desktop (incl. Fullscreen)
  let controlsTimer = null;
  let controlsVisible = false;
  let lastToggleTime = 0;
  let lastClickHideAt = 0;
  let lastMousePos = { x: -1, y: -1 };

  function showControls(autoHide = true) {
    controlsVisible = true;
    if (dom.playerControlsBar) dom.playerControlsBar.classList.add('visible');
    if (dom.playerWrapper) dom.playerWrapper.classList.add('show-controls');
    clearTimeout(controlsTimer);
    const pickerOpen = dom.trackPickerMenu && !dom.trackPickerMenu.classList.contains('hidden');
    if (autoHide && !dom.video.paused && !pickerOpen) {
      controlsTimer = setTimeout(hideControls, 3500);
    }
  }

  function hideControls() {
    controlsVisible = false;
    if (dom.playerControlsBar) dom.playerControlsBar.classList.remove('visible');
    if (dom.playerWrapper) dom.playerWrapper.classList.remove('show-controls');
    if (dom.trackPickerMenu) dom.trackPickerMenu.classList.add('hidden');
    if (document.activeElement && dom.playerWrapper && dom.playerWrapper.contains(document.activeElement)) {
      if (typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }
    clearTimeout(controlsTimer);
  }

  function toggleControls() {
    const now = Date.now();
    if (now - lastToggleTime < 250) return;
    lastToggleTime = now;

    if (controlsVisible) {
      lastClickHideAt = now;
      hideControls();
    } else {
      showControls(true);
    }
  }

  // Expose helper so closing track picker or changing tracks restarts auto-hide cleanly
  window.__floliteRefreshControlsTimer = () => {
    if (controlsVisible) showControls(true);
  };

  // Tap or click on player background to toggle controls
  dom.playerWrapper.addEventListener('click', (e) => {
    if (
      e.target.closest('.player-controls-bar') ||
      e.target.closest('.track-picker-menu') ||
      e.target.closest('.modal') ||
      e.target.closest('.stats-overlay')
    ) {
      return;
    }
    toggleControls();
  });

  // Wake controls on real mouse movement (works across desktop mice, touch-laptops, and headless), ignoring touch synthetic moves
  dom.playerWrapper.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const dx = Math.abs(e.clientX - lastMousePos.x);
    const dy = Math.abs(e.clientY - lastMousePos.y);
    lastMousePos = { x: e.clientX, y: e.clientY };
    if (dx < 3 && dy < 3) return;
    if (Date.now() - lastClickHideAt < 450) return;
    showControls(true);
  });

  dom.playerWrapper.addEventListener('mouseleave', () => {
    if (!dom.video.paused) {
      hideControls();
    }
  });

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
    dom.btnFullscreen.blur();
    if (!document.fullscreenElement) {
      dom.playerWrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  const handleFullscreenChange = () => {
    if (dom.btnFullscreen) dom.btnFullscreen.blur();
    if (document.fullscreenElement === dom.playerWrapper) {
      showControls(true);
    } else if (!dom.video.paused) {
      showControls(true);
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

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

  if (dom.btnAspect) {
    dom.btnAspect.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleAspectRatio();
    });
  }

  if (dom.btnCloseTrackPicker) {
    dom.btnCloseTrackPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dom.trackPickerMenu) dom.trackPickerMenu.classList.add('hidden');
      if (typeof window.__floliteRefreshControlsTimer === 'function') {
        window.__floliteRefreshControlsTimer();
      }
    });
  }
  if (dom.btnServer) {
    dom.btnServer.addEventListener('click', (e) => {
      e.stopPropagation();
      openWebTrackPicker('server');
    });
  }
  if (dom.btnAudioTrack) {
    dom.btnAudioTrack.addEventListener('click', (e) => {
      e.stopPropagation();
      openWebTrackPicker('audio');
    });
  }
  if (dom.btnSubtitles) {
    dom.btnSubtitles.addEventListener('click', (e) => {
      e.stopPropagation();
      openWebTrackPicker('sub');
    });
  }
  document.addEventListener('click', () => {
    if (dom.trackPickerMenu) dom.trackPickerMenu.classList.add('hidden');
  });

  if (dom.btnStats) {
    dom.btnStats.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStatsHUD();
    });
  }

  if (dom.btnCloseStats) {
    dom.btnCloseStats.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStatsHUD();
    });
  }

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
    dom.settingsModal.classList.remove('hidden');
  });

  dom.btnCloseSettings.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));

  dom.proxyModeSelect.addEventListener('change', (e) => {
    dom.customProxyGroup.classList.toggle('hidden', e.target.value !== 'custom');
  });

  dom.btnSaveSettings.addEventListener('click', () => {
    state.proxyMode = dom.proxyModeSelect.value;
    state.customProxyUrl = dom.customProxyInput.value.trim();

    localStorage.setItem('flolite_proxy_mode', state.proxyMode);
    localStorage.setItem('flolite_custom_proxy', state.customProxyUrl);

    dom.settingsModal.classList.add('hidden');
    if (state.currentChannel) {
      playChannel(state.currentChannel);
    }
  });
}

// Keyboard & TV Remote Control Navigation
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    // If typing in input, don't intercept navigation
    if (
      activeEl === dom.searchInput ||
      activeEl === dom.customProxyInput ||
      activeEl === dom.vodSearchInput ||
      activeEl === dom.epgSearchInput
    ) {
      if (e.key === 'Escape') {
        activeEl.blur();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (dom.epgModal && !dom.epgModal.classList.contains('hidden')) {
        closeEpgGuide();
        return;
      }
      if (dom.aboutModal && !dom.aboutModal.classList.contains('hidden')) {
        dom.aboutModal.classList.add('hidden');
        return;
      }
      if (dom.settingsModal && !dom.settingsModal.classList.contains('hidden')) {
        dom.settingsModal.classList.add('hidden');
        return;
      }
      if (dom.vodModal && !dom.vodModal.classList.contains('hidden')) {
        dom.vodModal.classList.add('hidden');
        return;
      }
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
      case 'g':
      case 'G':
        e.preventDefault();
        if (dom.epgModal && !dom.epgModal.classList.contains('hidden')) {
          closeEpgGuide();
        } else {
          openEpgGuide(state.currentChannel);
        }
        break;
      case 'm':
      case 'M':
        dom.btnMute.click();
        break;
      case 'i':
      case 'I':
        if (state.currentChannel) showOsd(state.currentChannel);
        break;
      case 'a':
      case 'A':
        cycleAspectRatio();
        break;
      case 's':
      case 'S':
        toggleStatsHUD();
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
        artist: channel.is_radio ? 'Radio Live • FloLite 4.5' : 'TV Live • FloLite 4.5',
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

// About Modal & Live Diagnostics
function setupAboutModal() {
  if (dom.btnAbout && dom.aboutModal) {
    dom.btnAbout.addEventListener('click', () => {
      const diagChannels = document.getElementById('diag-channels-count');
      if (diagChannels) diagChannels.textContent = `${state.channels.length} posturi TV & Radio`;

      const diagHls = document.getElementById('diag-hls-mode');
      if (diagHls) {
        const hasMpegTs = typeof window.mpegts !== 'undefined' && mpegts.getFeatureList().mseLivePlayback;
        const hasHls = window.Hls && Hls.isSupported();
        diagHls.textContent = hasHls && hasMpegTs
          ? 'HLS.js + mpegts.js Hybrid (Hardware Accelerated)'
          : (hasHls ? 'HLS.js Hardware Accelerated' : 'Native Browser HLS');
      }

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

// Encode URI Path for Cartoonix streaming assets
function encodeUriPath(path) {
  if (!path) return '';
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
}

// VOD Library: Cartoonix & Cinepub
async function loadAndRenderVod() {
  if (!state.vodLoaded) {
    dom.spinner.classList.remove('hidden');
    try {
      const [cartoonixRes, cinepubRes] = await Promise.all([
        fetch('cartoonix_catalog.json').then(r => r.json()).catch(() => []),
        fetch('cinepub_catalog.json').then(r => r.json()).catch(() => ({ movies: [] }))
      ]);
      state.cartoonixCatalog = Array.isArray(cartoonixRes) ? cartoonixRes : [];
      state.cinepubCatalog = Array.isArray(cinepubRes.movies) ? cinepubRes.movies : (Array.isArray(cinepubRes) ? cinepubRes : []);
      state.vodLoaded = true;
    } catch (e) {
      console.error('Error loading VOD catalogs:', e);
    } finally {
      dom.spinner.classList.add('hidden');
    }
  }

  renderVodUI();
}

function renderVodUI() {
  if (state.activeVodPlatform === 'cartoonix') {
    dom.tabVodCartoonix.classList.add('active');
    dom.tabVodCinepub.classList.remove('active');
  } else {
    dom.tabVodCinepub.classList.add('active');
    dom.tabVodCartoonix.classList.remove('active');
  }

  buildVodCategories();
  renderVodGrid();
}

function buildVodCategories() {
  let categories = ['Toate'];
  if (state.activeVodPlatform === 'cartoonix') {
    categories = ['Toate', 'Cartoon Network', 'Jetix', 'Minimax', 'Boomerang'];
  } else {
    categories = ['Toate', 'Lungmetraje', 'Scurtmetraje', 'Documentare', 'Animație', 'UNATC', 'UBB', 'Experimentale'];
  }

  dom.vodCategoriesBar.innerHTML = '';
  categories.forEach(cat => {
    const chip = document.createElement('button');
    const isActive = cat.toLowerCase() === state.currentVodCategory.toLowerCase();
    chip.className = `vod-chip ${isActive ? 'active' : ''}`;
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      state.currentVodCategory = cat;
      document.querySelectorAll('.vod-chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
      renderVodGrid();
    });
    dom.vodCategoriesBar.appendChild(chip);
  });
}

function renderVodGrid() {
  dom.vodGridContainer.innerHTML = '';
  const query = (state.vodSearchQuery || '').toLowerCase().trim();
  const cat = (state.currentVodCategory || 'Toate').toLowerCase();

  if (state.activeVodPlatform === 'cartoonix') {
    let list = state.cartoonixCatalog;
    if (cat !== 'toate') {
      list = list.filter(s => (s.channel && s.channel.toLowerCase() === cat) || (s.category && s.category.toLowerCase().includes(cat)));
    }
    if (query) {
      list = list.filter(s => (s.title && s.title.toLowerCase().includes(query)) || (s.description && s.description.toLowerCase().includes(query)));
    }

    if (list.length === 0) {
      dom.vodGridContainer.innerHTML = `<div class="vod-empty" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 15px;">🔍 Niciun desen animat găsit</div>`;
      return;
    }

    list.forEach(show => {
      const card = document.createElement('div');
      card.className = 'vod-card';
      const thumb = show.thumbnail || show.banner || 'logos/cartoonix.png';
      const epCount = show.episodes ? show.episodes.length : 0;
      card.innerHTML = `
        <div class="vod-card-thumb-wrap">
          <img class="vod-card-thumb" src="${thumb}" alt="${show.title}" loading="lazy" onerror="this.src='logos/cartoonix.png'">
          <span class="vod-card-badge">${show.channel || 'Cartoonix'}</span>
        </div>
        <div class="vod-card-info">
          <div class="vod-card-title">${show.title}</div>
          <div class="vod-card-sub">${epCount} Episoade • ${show.year || 'Dublat'}</div>
        </div>
      `;
      card.addEventListener('click', () => openCartoonixDetails(show));
      dom.vodGridContainer.appendChild(card);
    });
  } else {
    // Cinepub
    let list = state.cinepubCatalog;
    if (cat !== 'toate') {
      list = list.filter(m => m.categories && m.categories.some(c => c.toLowerCase().includes(cat)));
    }
    if (query) {
      list = list.filter(m => (m.title && m.title.toLowerCase().includes(query)) || (m.synopsis && m.synopsis.toLowerCase().includes(query)) || (m.year && m.year.includes(query)));
    }

    if (list.length === 0) {
      dom.vodGridContainer.innerHTML = `<div class="vod-empty" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 15px;">🔍 Niciun film Cinepub găsit</div>`;
      return;
    }

    list.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'vod-card';
      const poster = movie.poster || 'logos/cinepub.png';
      card.innerHTML = `
        <div class="vod-card-thumb-wrap">
          <img class="vod-card-thumb" src="${poster}" alt="${movie.title}" loading="lazy" onerror="this.src='logos/cinepub.png'">
          <span class="vod-card-badge" style="color: #F59E0B;">Cinepub</span>
        </div>
        <div class="vod-card-info">
          <div class="vod-card-title">${movie.title}</div>
          <div class="vod-card-sub">${movie.year || ''} • ${movie.duration || 'Online'}</div>
        </div>
      `;
      card.addEventListener('click', () => openCinepubDetails(movie));
      dom.vodGridContainer.appendChild(card);
    });
  }
}

function openCartoonixDetails(show) {
  dom.vodModalTitle.textContent = show.title;
  const thumb = show.thumbnail || show.banner || 'logos/cartoonix.png';
  const episodes = show.episodes || [];

  let epsHtml = '';
  episodes.forEach((ep, idx) => {
    epsHtml += `
      <button class="vod-ep-btn" data-idx="${idx}">
        <span class="vod-ep-num">#${idx + 1}</span>
        <span class="vod-ep-title">${ep.title}</span>
      </button>
    `;
  });

  dom.vodModalBody.innerHTML = `
    <div class="vod-detail-hero">
      <img src="${thumb}" class="vod-detail-poster" alt="${show.title}" onerror="this.src='logos/cartoonix.png'">
      <div class="vod-detail-meta">
        <h4 class="vod-detail-title">${show.title}</h4>
        <div class="vod-detail-badges">
          <span class="vod-meta-badge">${show.channel || 'Desene'}</span>
          <span class="vod-meta-badge">${episodes.length} Episoade</span>
          ${show.year ? `<span class="vod-meta-badge">${show.year}</span>` : ''}
        </div>
        <p class="vod-detail-synopsis">${show.description || 'Desene animate clasice dublate în limba română din colecția Cartoonix.'}</p>
      </div>
    </div>
    <div class="vod-episodes-heading">Episoade Disponibile (${episodes.length}):</div>
    <div class="vod-episodes-grid">
      ${epsHtml}
    </div>
  `;

  dom.vodModalBody.querySelectorAll('.vod-ep-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const ep = episodes[idx];
      if (ep) {
        playCartoonixEpisode(show, ep);
      }
    });
  });

  dom.vodModal.classList.remove('hidden');
}

function openCinepubDetails(movie) {
  dom.vodModalTitle.textContent = movie.title;
  const poster = movie.poster || 'logos/cinepub.png';

  dom.vodModalBody.innerHTML = `
    <div class="vod-detail-hero">
      <img src="${poster}" class="vod-detail-poster" alt="${movie.title}" onerror="this.src='logos/cinepub.png'">
      <div class="vod-detail-meta">
        <h4 class="vod-detail-title">${movie.title}</h4>
        <div class="vod-detail-badges">
          <span class="vod-meta-badge" style="color: #F59E0B;">Cinepub Oficial</span>
          ${movie.year ? `<span class="vod-meta-badge">${movie.year}</span>` : ''}
          ${movie.duration ? `<span class="vod-meta-badge">${movie.duration}</span>` : ''}
        </div>
        <p class="vod-detail-synopsis">${movie.synopsis || 'Film din arhiva de patrimoniu a cinematografiei românești oferit prin Cinepub.'}</p>
        ${movie.director ? `<p class="vod-detail-synopsis" style="margin-top: 4px;"><strong>Regie:</strong> ${movie.director}</p>` : ''}
        <button id="btn-watch-cinepub-now" class="vod-btn-play-movie">▶ Vizionează Filmul Acum</button>
      </div>
    </div>
  `;

  const watchBtn = dom.vodModalBody.querySelector('#btn-watch-cinepub-now');
  if (watchBtn) {
    watchBtn.addEventListener('click', () => {
      playCinepubMovie(movie);
    });
  }

  dom.vodModal.classList.remove('hidden');
}

function closeVodModal() {
  if (dom.vodModal) {
    dom.vodModal.classList.add('hidden');
  }
}

function playCartoonixEpisode(show, episode) {
  state.currentVodShow = show;
  state.currentVodEpisode = episode;
  state.currentVodMovie = null;
  state.isVodPlaying = true;

  if (dom.youtubePlayer) {
    dom.youtubePlayer.src = '';
    dom.youtubePlayer.classList.add('hidden');
  }
  dom.video.classList.remove('hidden');

  destroyActivePlayers();

  const fullUrl = 'https://cartoonix.ro/api' + encodeUriPath(episode.video_url);
  dom.video.src = fullUrl;
  dom.video.play().catch(e => console.warn('Episode play error:', e));

  // Enable Theatre Mode & show VOD Theatre Controls
  if (dom.mainContent) dom.mainContent.classList.add('vod-playing');
  if (dom.playerSection) dom.playerSection.classList.remove('hidden');
  if (dom.vodTheatreBar) {
    dom.vodTheatreBar.classList.remove('hidden');
    dom.vodTheatreBadge.textContent = 'CARTOONIX';
    dom.vodTheatreBadge.className = 'vod-theatre-badge badge-cartoonix';
    dom.vodTheatreTitle.textContent = `${show.title} • ${episode.title}`;

    const eps = show.episodes || [];
    const idx = eps.indexOf(episode);
    dom.btnVodPrevEp.classList.toggle('hidden', idx <= 0);
    dom.btnVodNextEp.classList.toggle('hidden', idx < 0 || idx >= eps.length - 1);
  }

  if (dom.vodNowWatchingBar) {
    dom.vodNowWatchingBar.classList.remove('hidden');
    dom.nowWatchingTitle.textContent = `${show.title} • ${episode.title}`;
  }

  dom.osdName.textContent = show.title;
  dom.osdGroup.textContent = show.channel || 'Cartoonix';
  dom.osdEpgTitle.textContent = episode.title;
  showOsd({
    name: show.title,
    group: show.channel || 'Cartoonix',
    resolution: 'FHD',
    logo: 'logos/cartoonix.png'
  });

  closeVodModal();
  if (dom.playerSection) {
    dom.playerSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function playCinepubMovie(movie) {
  state.currentVodShow = null;
  state.currentVodEpisode = null;
  state.currentVodMovie = movie;
  state.isVodPlaying = true;

  destroyActivePlayers();
  dom.video.pause();
  dom.video.removeAttribute('src');
  dom.video.classList.add('hidden');

  if (dom.youtubePlayer) {
    dom.youtubePlayer.classList.remove('hidden');
    // cc_load_policy=1&cc_lang_pref=ro&hl=ro for default Romanian subtitles
    dom.youtubePlayer.src = `https://www.youtube-nocookie.com/embed/${movie.yt_id}?autoplay=1&cc_load_policy=1&cc_lang_pref=ro&hl=ro&rel=0`;
  }

  // Enable Theatre Mode & show VOD Theatre Controls
  if (dom.mainContent) dom.mainContent.classList.add('vod-playing');
  if (dom.playerSection) dom.playerSection.classList.remove('hidden');
  if (dom.vodTheatreBar) {
    dom.vodTheatreBar.classList.remove('hidden');
    dom.vodTheatreBadge.textContent = 'CINEPUB';
    dom.vodTheatreBadge.className = 'vod-theatre-badge badge-cinepub';
    dom.vodTheatreTitle.textContent = `${movie.title} (${movie.year || 'Film Online'})`;
    dom.btnVodPrevEp.classList.add('hidden');
    dom.btnVodNextEp.classList.add('hidden');
  }

  if (dom.vodNowWatchingBar) {
    dom.vodNowWatchingBar.classList.remove('hidden');
    dom.nowWatchingTitle.textContent = `${movie.title} (${movie.year || 'Film Online'})`;
  }

  dom.osdName.textContent = movie.title;
  dom.osdGroup.textContent = `Cinepub • ${movie.year || ''}`;
  showOsd({
    name: movie.title,
    group: `Cinepub • ${movie.year || ''}`,
    resolution: 'HD',
    logo: 'logos/cinepub.png'
  });

  closeVodModal();
  if (dom.playerSection) {
    dom.playerSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function closeVodPlayer() {
  state.isVodPlaying = false;
  state.currentVodShow = null;
  state.currentVodEpisode = null;
  state.currentVodMovie = null;

  dom.video.pause();
  dom.video.removeAttribute('src');
  dom.video.load();

  if (dom.youtubePlayer) {
    dom.youtubePlayer.src = '';
    dom.youtubePlayer.classList.add('hidden');
  }

  if (dom.mainContent) dom.mainContent.classList.remove('vod-playing');
  if (dom.playerSection) dom.playerSection.classList.add('hidden');
  if (dom.vodTheatreBar) dom.vodTheatreBar.classList.add('hidden');
  if (dom.vodNowWatchingBar) dom.vodNowWatchingBar.classList.add('hidden');

  if (dom.mainContent) {
    dom.mainContent.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function playNextVodEpisode() {
  if (!state.currentVodShow || !state.currentVodEpisode) return;
  const eps = state.currentVodShow.episodes || [];
  const curIdx = eps.indexOf(state.currentVodEpisode);
  if (curIdx >= 0 && curIdx + 1 < eps.length) {
    playCartoonixEpisode(state.currentVodShow, eps[curIdx + 1]);
  }
}

function playPreviousVodEpisode() {
  if (!state.currentVodShow || !state.currentVodEpisode) return;
  const eps = state.currentVodShow.episodes || [];
  const curIdx = eps.indexOf(state.currentVodEpisode);
  if (curIdx > 0) {
    playCartoonixEpisode(state.currentVodShow, eps[curIdx - 1]);
  }
}

// ========================
// EPG PROGRAM GUIDE (DESKTOP + MOBILE)
// ========================
const epgGuideState = {
  selectedChannel: null,
  dayFilter: 'today',
  searchQuery: '',
  mobileShowSchedule: false
};

function updateEpgSyncBadge() {
  if (!dom.epgSyncStatus) return;
  const channelKeys = Object.keys(state.epg || {});
  const now = Date.now();
  let liveCount = 0;
  for (const key of channelKeys) {
    const list = state.epg[key];
    if (Array.isArray(list) && list.some(p => p.start <= now && p.stop > now)) {
      liveCount++;
    }
  }
  if (liveCount > 0) {
    dom.epgSyncStatus.textContent = `${liveCount} canale cu program LIVE`;
  } else if (channelKeys.length > 0) {
    dom.epgSyncStatus.textContent = `${channelKeys.length} ghiduri încărcate (Sync activ)`;
  } else {
    dom.epgSyncStatus.textContent = 'Se încarcă ghidul EPG...';
  }
}

function setEpgMobilePane(showSchedule) {
  epgGuideState.mobileShowSchedule = Boolean(showSchedule);
  if (dom.epgGuideBody) {
    dom.epgGuideBody.classList.toggle('mobile-show-schedule', epgGuideState.mobileShowSchedule);
  }
  if (dom.epgTabChannels) {
    dom.epgTabChannels.classList.toggle('active', !epgGuideState.mobileShowSchedule);
  }
  if (dom.epgTabSchedule) {
    dom.epgTabSchedule.classList.toggle('active', epgGuideState.mobileShowSchedule);
  }
}

function openEpgGuide(initialChannel = null) {
  if (!dom.epgModal) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  const hasEpgData = (c) => Boolean(c && !c.is_radio && c.epg_id && Array.isArray(state.epg[c.epg_id]) && state.epg[c.epg_id].length > 0);
  const firstEpgChannel =
    state.channels.find(c => hasEpgData(c) && getCurrentEpg(c.epg_id)) ||
    state.channels.find(c => hasEpgData(c));

  const targetChannel =
    (hasEpgData(initialChannel) ? initialChannel : null) ||
    (hasEpgData(state.currentChannel) ? state.currentChannel : null) ||
    firstEpgChannel ||
    initialChannel ||
    state.currentChannel ||
    state.channels.find(c => !c.is_radio) ||
    state.channels[0] ||
    null;

  epgGuideState.selectedChannel = targetChannel;
  epgGuideState.dayFilter = 'today';

  if (dom.epgDayFilters) {
    dom.epgDayFilters.querySelectorAll('.epg-day-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.day === 'today');
    });
  }

  // On narrow screens start on Schedule if we already have an active playing channel with EPG, otherwise Channels
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  setEpgMobilePane(isMobile && hasEpgData(state.currentChannel));

  updateEpgSyncBadge();
  renderEpgChannels();
  renderEpgSchedule();

  dom.epgModal.classList.remove('hidden');

  // If EPG has too few current programs for today yet, kick off network sync in background
  if (typeof syncEpgFromNetwork === 'function') {
    const now = Date.now();
    let liveCount = 0;
    for (const list of Object.values(state.epg || {})) {
      if (Array.isArray(list) && list.some(p => p.start <= now && p.stop > now)) liveCount++;
    }
    if (liveCount < 10) {
      localStorage.removeItem('flolite_epg_timestamp');
      syncEpgFromNetwork();
    }
  }
}

function closeEpgGuide() {
  if (dom.epgModal) dom.epgModal.classList.add('hidden');
}

function renderEpgChannels() {
  if (!dom.epgChannelsPane) return;
  dom.epgChannelsPane.innerHTML = '';

  const q = epgGuideState.searchQuery.trim().toLowerCase();
  const tvChannels = (state.channels || []).filter(ch => !ch.is_radio);

  const filtered = tvChannels.filter(ch => {
    if (!q) return true;
    const nameMatch = (ch.name || '').toLowerCase().includes(q);
    const groupMatch = (ch.group || '').toLowerCase().includes(q);
    const cur = ch.epg_id ? getCurrentEpg(ch.epg_id) : null;
    const nxt = ch.epg_id ? getNextEpg(ch.epg_id) : null;
    const curMatch = cur && (cur.title || '').toLowerCase().includes(q);
    const nxtMatch = nxt && (nxt.title || '').toLowerCase().includes(q);
    return nameMatch || groupMatch || curMatch || nxtMatch;
  });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'epg-empty-state';
    empty.textContent = 'Niciun canal sau emisiune găsită pentru filtrul curent.';
    dom.epgChannelsPane.appendChild(empty);
    return;
  }

  const ordered = q
    ? filtered
    : filtered.slice().sort((a, b) => {
        const aHas = (a.epg_id && state.epg[a.epg_id] && state.epg[a.epg_id].length > 0) ? 1 : 0;
        const bHas = (b.epg_id && state.epg[b.epg_id] && state.epg[b.epg_id].length > 0) ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return 0;
      });

  // Put channels with EPG first when not searching so guide feels rich immediately, while preserving active channel visibility
  const frag = document.createDocumentFragment();
  ordered.slice(0, 220).forEach(ch => {
    const row = document.createElement('button');
    row.type = 'button';
    const isSelected = epgGuideState.selectedChannel && epgGuideState.selectedChannel.id === ch.id;
    row.className = 'epg-channel-row' + (isSelected ? ' active' : '');

    const img = document.createElement('img');
    img.className = 'epg-row-logo';
    img.src = ch.logo || 'logos/acasa4k.png';
    img.alt = ch.name || '';
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'logos/acasa4k.png'; };

    const info = document.createElement('div');
    info.className = 'epg-row-info';

    const title = document.createElement('span');
    title.className = 'epg-row-name';
    title.textContent = `${ch.number ? ch.number + '. ' : ''}${ch.name}`;

    const cur = ch.epg_id ? getCurrentEpg(ch.epg_id) : null;
    const nowLine = document.createElement('span');
    if (cur) {
      nowLine.className = 'epg-row-now';
      nowLine.textContent = `${formatTime(cur.start)} • ${cur.title}`;
    } else {
      const list = ch.epg_id && state.epg[ch.epg_id];
      nowLine.className = 'epg-row-now empty';
      nowLine.textContent = list && list.length > 0
        ? `${list.length} emisiuni în ghid`
        : `${ch.group || 'TV'} • Fără program EPG`;
    }

    info.appendChild(title);
    info.appendChild(nowLine);
    row.appendChild(img);
    row.appendChild(info);

    row.addEventListener('click', () => {
      epgGuideState.selectedChannel = ch;
      renderEpgChannels();
      renderEpgSchedule();
      setEpgMobilePane(true);
    });

    frag.appendChild(row);
  });

  dom.epgChannelsPane.appendChild(frag);
}

function renderEpgSchedule() {
  if (!dom.epgTimelineList) return;
  const ch = epgGuideState.selectedChannel;

  if (!ch) {
    dom.epgTimelineList.innerHTML = '';
    return;
  }

  if (dom.epgHeroLogo) {
    dom.epgHeroLogo.src = ch.logo || 'logos/acasa4k.png';
    dom.epgHeroLogo.onerror = () => { dom.epgHeroLogo.src = 'logos/acasa4k.png'; };
  }
  if (dom.epgHeroName) dom.epgHeroName.textContent = ch.name || 'Canal TV';
  if (dom.epgHeroGroup) dom.epgHeroGroup.textContent = `${ch.group || 'General'} • ${ch.resolution || 'HD'}`;

  dom.epgTimelineList.innerHTML = '';
  const rawList = (ch.epg_id && Array.isArray(state.epg[ch.epg_id])) ? state.epg[ch.epg_id] : [];

  if (rawList.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'epg-empty-state';
    empty.textContent = 'Momentan nu există program EPG disponibil pentru acest canal.';
    dom.epgTimelineList.appendChild(empty);
    return;
  }

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayStartMs = startOfToday.getTime();
  const tomorrowStartMs = todayStartMs + 86400000;
  const dayAfterStartMs = tomorrowStartMs + 86400000;

  let items = rawList.slice().sort((a, b) => a.start - b.start);
  if (epgGuideState.dayFilter === 'today') {
    items = items.filter(p => p.stop > todayStartMs && p.start < tomorrowStartMs);
  } else if (epgGuideState.dayFilter === 'tomorrow') {
    items = items.filter(p => p.stop > tomorrowStartMs && p.start < dayAfterStartMs);
  }

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'epg-empty-state';
    empty.textContent = 'Nu sunt emisiuni pentru ziua selectată. Încearcă filtrul „Toate (48h)” sau așteaptă sincronizarea EPG.';
    dom.epgTimelineList.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  let liveCardEl = null;

  items.forEach(prog => {
    const isLive = prog.start <= now && prog.stop > now;
    const isPast = prog.stop <= now;

    const card = document.createElement('div');
    card.className = 'epg-prog-card' + (isLive ? ' is-live' : (isPast ? ' is-past' : ''));
    if (isLive) liveCardEl = card;

    const top = document.createElement('div');
    top.className = 'epg-prog-top';

    const timeEl = document.createElement('span');
    timeEl.className = 'epg-prog-time';
    const dayPrefix = epgGuideState.dayFilter === 'all'
      ? new Date(prog.start).toLocaleDateString('ro-RO', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' • '
      : '';
    timeEl.textContent = `${dayPrefix}${formatTime(prog.start)} – ${formatTime(prog.stop)}`;
    top.appendChild(timeEl);

    if (isLive) {
      const livePill = document.createElement('span');
      livePill.className = 'epg-prog-live-pill';
      livePill.textContent = 'LIVE ACUM';
      top.appendChild(livePill);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'epg-prog-title';
    titleEl.textContent = prog.title || 'Emisiune TV';

    card.appendChild(top);
    card.appendChild(titleEl);

    if (prog.desc) {
      const descEl = document.createElement('div');
      descEl.className = 'epg-prog-desc';
      descEl.textContent = prog.desc;
      card.appendChild(descEl);
    }

    if (isLive) {
      const progBar = document.createElement('div');
      progBar.className = 'epg-prog-progress';
      const fill = document.createElement('div');
      fill.className = 'epg-prog-progress-fill';
      fill.style.width = `${Math.round(getProgressPercent(prog.start, prog.stop))}%`;
      progBar.appendChild(fill);
      card.appendChild(progBar);
    }

    frag.appendChild(card);
  });

  dom.epgTimelineList.appendChild(frag);
  if (liveCardEl) {
    requestAnimationFrame(() => {
      liveCardEl.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  }
}

function setupEpgGuide() {
  if (dom.btnEpgGuide) {
    dom.btnEpgGuide.addEventListener('click', () => openEpgGuide(state.currentChannel));
  }
  if (dom.btnPlayerEpg) {
    dom.btnPlayerEpg.addEventListener('click', (e) => {
      e.stopPropagation();
      openEpgGuide(state.currentChannel);
    });
  }
  if (dom.btnDetailsEpg) {
    dom.btnDetailsEpg.addEventListener('click', () => openEpgGuide(state.currentChannel));
  }
  if (dom.btnCloseEpgModal) {
    dom.btnCloseEpgModal.addEventListener('click', closeEpgGuide);
  }
  if (dom.epgModal) {
    dom.epgModal.addEventListener('click', (e) => {
      if (e.target === dom.epgModal) closeEpgGuide();
    });
  }
  if (dom.epgTabChannels) {
    dom.epgTabChannels.addEventListener('click', () => setEpgMobilePane(false));
  }
  if (dom.epgTabSchedule) {
    dom.epgTabSchedule.addEventListener('click', () => setEpgMobilePane(true));
  }
  if (dom.btnEpgBackChannels) {
    dom.btnEpgBackChannels.addEventListener('click', () => setEpgMobilePane(false));
  }
  if (dom.epgSearchInput) {
    dom.epgSearchInput.addEventListener('input', (e) => {
      epgGuideState.searchQuery = e.target.value || '';
      if (dom.btnClearEpgSearch) {
        dom.btnClearEpgSearch.classList.toggle('hidden', !epgGuideState.searchQuery);
      }
      renderEpgChannels();
    });
  }
  if (dom.btnClearEpgSearch) {
    dom.btnClearEpgSearch.addEventListener('click', () => {
      epgGuideState.searchQuery = '';
      if (dom.epgSearchInput) dom.epgSearchInput.value = '';
      dom.btnClearEpgSearch.classList.add('hidden');
      renderEpgChannels();
    });
  }
  if (dom.epgDayFilters) {
    dom.epgDayFilters.querySelectorAll('.epg-day-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        epgGuideState.dayFilter = pill.dataset.day || 'today';
        dom.epgDayFilters.querySelectorAll('.epg-day-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderEpgSchedule();
      });
    });
  }
  if (dom.btnEpgWatch) {
    dom.btnEpgWatch.addEventListener('click', () => {
      if (epgGuideState.selectedChannel) {
        const ch = epgGuideState.selectedChannel;
        closeEpgGuide();
        playChannel(ch);
      }
    });
  }
}

// Start
init();
