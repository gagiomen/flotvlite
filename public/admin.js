const keyInput = document.getElementById('admin-key');
const saved = sessionStorage.getItem('flolite_admin_key');
if (saved) keyInput.value = saved;

const fmt = (ms) => ms ? new Date(ms).toLocaleString('ro-RO') : '-';

async function api(path, opts = {}) {
  const key = keyInput.value.trim();
  sessionStorage.setItem('flolite_admin_key', key);
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key, ...(opts.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function refresh() {
  try {
    const d = await api('/api/admin/licenses');
    document.getElementById('dash').classList.remove('hidden');
    document.getElementById('lic-count').textContent = d.licenses.length;

    const addCell = (tr, txt, styleCss = '') => {
      const td = document.createElement('td');
      if (styleCss) td.style.cssText = styleCss;
      td.textContent = txt;
      tr.appendChild(td);
      return td;
    };

    const tbPay = document.getElementById('tb-payments');
    tbPay.innerHTML = '';
    for (const p of d.payments) {
      const tr = document.createElement('tr');
      const pending = p.status === 'pending';
      addCell(tr, fmt(p.created_at));
      addCell(tr, p.pairing_code || '-', 'font-weight:700');
      addCell(tr, p.provider || '');
      addCell(tr, p.amount_charged || `${p.amount_ron} ${p.currency}`);
      const tdSt = document.createElement('td');
      const sp = document.createElement('span');
      sp.className = `badge ${pending ? 'b-pending' : 'b-active'}`;
      sp.textContent = pending ? 'neverificată (pending)' : p.status;
      tdSt.appendChild(sp);
      tr.appendChild(tdSt);
      addCell(tr, p.note || '');
      const tdAct = document.createElement('td');
      tdAct.className = 'row';
      if (pending) {
        const btn = document.createElement('button');
        btn.className = 'ok';
        btn.dataset.approve = p.id;
        btn.textContent = '✅ Confirmă +30z';
        const btnDel = document.createElement('button');
        btnDel.className = 'danger';
        btnDel.dataset.reject = p.id;
        btnDel.textContent = '❌ Șterge';
        tdAct.append(btn, btnDel);
      } else {
        tdAct.textContent = '-';
      }
      tr.appendChild(tdAct);
      tbPay.appendChild(tr);
    }

    const tbLic = document.getElementById('tb-licenses');
    tbLic.innerHTML = '';
    const now = d.server_time || Date.now();
    for (const l of d.licenses) {
      const active = l.status !== 'banned' && Number(l.expires_at) >= now;
      const tr = document.createElement('tr');
      addCell(tr, l.pairing_code, 'color:var(--cyan);font-weight:700');
      const tdDev = addCell(tr, `${l.device_id.slice(0, 14)}...`);
      tdDev.title = l.device_id;
      const tdSt = document.createElement('td');
      const sp = document.createElement('span');
      sp.className = `badge ${active ? 'b-active' : 'b-exp'}`;
      sp.textContent = active ? l.status : 'expired';
      tdSt.appendChild(sp);
      tr.appendChild(tdSt);
      addCell(tr, fmt(l.expires_at));
      addCell(tr, fmt(l.last_seen_at));
      const tdAct = document.createElement('td');
      tdAct.className = 'row';
      const b30 = document.createElement('button'); b30.className = 'ok'; b30.dataset.ext = l.id; b30.textContent = '+30 zile';
      const b7 = document.createElement('button'); b7.className = 'sec'; b7.dataset.ext7 = l.id; b7.textContent = '+7 zile';
      const bBan = document.createElement('button'); bBan.className = 'danger'; bBan.dataset.ban = l.id;
      bBan.dataset.next = l.status === 'banned' ? 'active' : 'banned';
      bBan.textContent = l.status === 'banned' ? 'Deblochează' : 'Blochează';
      tdAct.append(b30, b7, bBan);
      tr.appendChild(tdAct);
      tbLic.appendChild(tr);
    }

    const tbCodes = document.getElementById('tb-codes');
    tbCodes.innerHTML = '';
    for (const c of d.activation_codes) {
      const tr = document.createElement('tr');
      addCell(tr, c.code, 'font-weight:700');
      addCell(tr, String(c.days));
      const tdSt = document.createElement('td');
      const sp = document.createElement('span');
      sp.className = `badge ${c.status === 'unused' ? 'b-active' : 'b-exp'}`;
      sp.textContent = c.status;
      tdSt.appendChild(sp);
      tr.appendChild(tdSt);
      addCell(tr, fmt(c.created_at));
      tbCodes.appendChild(tr);
    }
  } catch (e) {
    alert(e.message);
  }
}

document.getElementById('btn-login').onclick = refresh;
document.getElementById('btn-gen-codes').onclick = async () => {
  const count = Number(document.getElementById('gen-count').value || 5);
  const days = Number(document.getElementById('gen-days').value || 30);
  await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'generate_codes', count, days }) });
  refresh();
};

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.dataset.approve) {
    await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'approve_payment', payment_id: t.dataset.approve, days: 30 }) });
    refresh();
  } else if (t.dataset.reject) {
    await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'reject_payment', payment_id: t.dataset.reject }) });
    refresh();
  } else if (t.dataset.ext) {
    await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'extend', license_id: t.dataset.ext, days: 30 }) });
    refresh();
  } else if (t.dataset.ext7) {
    await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'extend', license_id: t.dataset.ext7, days: 7 }) });
    refresh();
  } else if (t.dataset.ban) {
    await api('/api/admin/licenses', { method: 'POST', body: JSON.stringify({ action: 'set_status', license_id: t.dataset.ban, status: t.dataset.next }) });
    refresh();
  }
});

if (saved) refresh();
