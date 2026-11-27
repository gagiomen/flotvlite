const params = new URLSearchParams(location.search);
let currentCode = (params.get('code') || '').trim().toUpperCase();

const el = {
  banner: document.getElementById('status-banner'),
  finderCard: document.getElementById('finder-card'),
  manualInput: document.getElementById('manual-tv-code'),
  btnFindTv: document.getElementById('btn-find-tv'),
  deviceCard: document.getElementById('device-card'),
  paymentCard: document.getElementById('payment-card'),
  voucherCard: document.getElementById('voucher-card'),
  codeDisplay: document.getElementById('tv-code-display'),
  pill: document.getElementById('license-pill'),
  meta: document.getElementById('license-meta'),
  eurEquiv: document.getElementById('eur-equiv'),
  btnPaypal: document.getElementById('btn-paypal'),
  paypalNote: document.getElementById('paypal-note'),
  paypalMeSection: document.getElementById('paypal-me-section'),
  btnPaypalMeLink: document.getElementById('btn-paypal-me-link'),
  paypalMeLabel: document.getElementById('paypal-me-label'),
  copyPpChip: document.getElementById('copy-pp-chip'),
  paypalMeStep2: document.getElementById('paypal-me-step2'),
  paypalMeSender: document.getElementById('paypal-me-sender'),
  btnPaypalMePaid: document.getElementById('btn-paypal-me-paid'),
  revolutSection: document.getElementById('revolut-section'),
  btnRevolutLink: document.getElementById('btn-revolut-link'),
  copyRefChip: document.getElementById('copy-ref-chip'),
  revolutStep2: document.getElementById('revolut-step2'),
  revolutSender: document.getElementById('revolut-sender'),
  btnRevolutPaid: document.getElementById('btn-revolut-paid'),
  voucherInput: document.getElementById('voucher-input'),
  btnRedeem: document.getElementById('btn-redeem')
};

function showBanner(type, msg) {
  el.banner.className = `banner ${type}`;
  el.banner.textContent = msg;
}

function fmtDate(ms) {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function loadDevice(code) {
  if (!code) {
    el.finderCard.classList.remove('hidden');
    return;
  }
  currentCode = code.trim().toUpperCase();
  try {
    const res = await fetch(`/api/pay/lookup?code=${encodeURIComponent(currentCode)}`);
    const data = await res.json();
    if (!res.ok) {
      el.finderCard.classList.remove('hidden');
      showBanner('err', data.error || 'Cod TV negăsit.');
      return;
    }

    el.finderCard.classList.add('hidden');
    el.deviceCard.classList.remove('hidden');
    el.paymentCard.classList.remove('hidden');
    el.voucherCard.classList.remove('hidden');

    el.codeDisplay.textContent = data.pairing_code;
    el.eurEquiv.textContent = `${data.price_eur} ${data.paypal_currency || 'EUR'}`;

    if (data.licensed) {
      el.pill.className = 'pill active';
      el.pill.textContent = `Activ (${data.days_left} zile)`;
      el.meta.textContent = `Licență valabilă până la ${fmtDate(data.expires_at)}. Orice prelungire adaugă +30 zile peste data curentă.`;
    } else {
      el.pill.className = 'pill expired';
      el.pill.textContent = 'Expirat';
      el.meta.textContent = `Expirat la ${fmtDate(data.expires_at)}. Achită mai jos pentru deblocare instantă pe televizor.`;
    }

    if (data.paypal_enabled) {
      el.btnPaypal.classList.remove('hidden');
      el.paypalNote.classList.remove('hidden');
      el.btnPaypal.disabled = false;
      el.paypalMeSection.classList.add('hidden');
    } else if (data.paypal_me_handle) {
      el.btnPaypal.classList.add('hidden');
      el.paypalNote.classList.add('hidden');
      el.paypalMeSection.classList.remove('hidden');
      const ppHandle = data.paypal_me_handle.replace(/^@/, '').trim();
      const cur = (data.paypal_currency || 'EUR').toUpperCase();
      el.btnPaypalMeLink.href = `https://www.paypal.me/${encodeURIComponent(ppHandle)}/${encodeURIComponent(data.price_eur)}${cur}`;
      el.paypalMeLabel.textContent = `Plătește ${data.price_eur} ${cur} prin PayPal.me`;
      el.copyPpChip.textContent = data.pairing_code;
    } else {
      el.btnPaypal.disabled = true;
      el.paypalNote.textContent = 'PayPal Business API urmează să fie conectat din variabilele Cloudflare.';
    }

    if (data.revolut_handle) {
      el.revolutSection.classList.remove('hidden');
      const cleanHandle = data.revolut_handle.replace(/^@/, '').trim();
      el.btnRevolutLink.href = `https://revolut.me/${encodeURIComponent(cleanHandle)}/ron${encodeURIComponent(data.price_ron)}/${encodeURIComponent(data.pairing_code)}`;
      el.copyRefChip.textContent = data.pairing_code;
    }
    window.dispatchEvent(new Event('flolite-device-loaded'));
  } catch (e) {
    showBanner('err', 'Eroare de conexiune la server.');
  }
}

async function handlePayPalReturnIfPresent() {
  const pp = params.get('pp');
  const token = params.get('token');
  if (pp === 'cancel') {
    showBanner('info', 'Plata PayPal a fost anulată.');
    return;
  }
  if (pp === 'return' && token) {
    showBanner('info', 'Se confirmă plata PayPal...');
    try {
      const res = await fetch('/api/pay/paypal-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: token })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showBanner('ok', `✅ Plată confirmată! Televizorul s-a deblocat (+30 zile). Expirare nouă: ${fmtDate(data.expires_at)}.`);
        await loadDevice(currentCode);
      } else {
        showBanner('err', data.error || 'Nu s-a putut confirma captura PayPal.');
      }
    } catch {
      showBanner('err', 'Eroare la verificarea plății PayPal.');
    }
  }
}

el.btnFindTv.addEventListener('click', () => loadDevice(el.manualInput.value));
el.manualInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadDevice(el.manualInput.value);
});

el.btnPaypal.addEventListener('click', async () => {
  el.btnPaypal.disabled = true;
  el.btnPaypal.textContent = 'Se inițiază PayPal...';
  try {
    const res = await fetch('/api/pay/paypal-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairing_code: currentCode })
    });
    const data = await res.json();
    if (res.ok && data.approve_url) {
      location.href = data.approve_url;
      return;
    }
    showBanner('err', data.error || 'Eroare creare comandă PayPal.');
  } catch {
    showBanner('err', 'Eroare rețea PayPal.');
  }
  el.btnPaypal.disabled = false;
  el.btnPaypal.textContent = 'Plătește Automat cu PayPal';
});

function bindManualPayment(linkEl, step2El, chipEl, senderEl, btnEl, provider, label) {
  let openedApp = false;
  const syncOpened = () => {
    if (currentCode && sessionStorage.getItem(`flolite_opened_${provider}`) === currentCode) {
      openedApp = true;
      step2El.classList.remove('hidden');
    }
  };
  window.addEventListener('flolite-device-loaded', syncOpened);
  window.addEventListener('pageshow', syncOpened);
  linkEl.addEventListener('click', () => {
    openedApp = true;
    if (currentCode) sessionStorage.setItem(`flolite_opened_${provider}`, currentCode);
    step2El.classList.remove('hidden');
  });
  chipEl.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      showBanner('info', `Codul ${currentCode} a fost copiat. Lipește-l la descrierea transferului ${label}.`);
    } catch {}
  });
  btnEl.addEventListener('click', async () => {
    const senderName = (senderEl.value || '').trim();
    if (senderName.length < 3) {
      showBanner('err', `Scrie numele titularului din aplicația ${label} ca să putem verifica plata.`);
      senderEl.focus();
      return;
    }
    btnEl.disabled = true;
    try {
      const res = await fetch('/api/pay/revolut-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: currentCode, provider, sender_name: senderName, opened_app: openedApp })
      });
      const data = await res.json();
      if (res.ok) {
        showBanner('ok', `✅ Cerere trimisă pentru ${currentCode} (${senderName})! După ce verificăm încasarea în ${label}, TV-ul se deblochează automat.`);
      } else {
        showBanner('err', data.error || 'Eroare la trimiterea notificării.');
      }
    } catch {
      showBanner('err', 'Eroare de rețea.');
    }
    btnEl.disabled = false;
  });
}

bindManualPayment(el.btnPaypalMeLink, el.paypalMeStep2, el.copyPpChip, el.paypalMeSender, el.btnPaypalMePaid, 'paypal_me', 'PayPal');
bindManualPayment(el.btnRevolutLink, el.revolutStep2, el.copyRefChip, el.revolutSender, el.btnRevolutPaid, 'revolut', 'Revolut');

el.btnRedeem.addEventListener('click', async () => {
  const code = (el.voucherInput.value || '').trim().toUpperCase();
  if (!code) return;
  el.btnRedeem.disabled = true;
  try {
    const res = await fetch('/api/tv/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairing_code: currentCode, code })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      showBanner('ok', `✅ Cod activat (+${data.days_added} zile)! Televizorul tău se va debloca în câteva secunde.`);
      el.voucherInput.value = '';
      await loadDevice(currentCode);
    } else {
      showBanner('err', data.error || 'Cod invalid sau deja folosit.');
    }
  } catch {
    showBanner('err', 'Eroare la activarea codului.');
  }
  el.btnRedeem.disabled = false;
});

(async () => {
  await loadDevice(currentCode);
  await handlePayPalReturnIfPresent();
})();
