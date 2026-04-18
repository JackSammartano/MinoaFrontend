/* eslint-env browser */

/* ---------- aforismi ---------- */
const QUOTES = [
  { text: 'La buona sala si vede nei dettagli prima che nei piatti.', author: null },
  { text: 'Il cibo è il nostro terreno comune, un\'esperienza universale.', author: 'James Beard' },
  { text: 'Dimmi quello che mangi e ti dirò chi sei.', author: 'Jean Anthelme Brillat-Savarin' },
  { text: 'Non si può pensare bene, amare bene, dormire bene, se non si ha cenato bene.', author: 'Virginia Woolf' },
  { text: 'Non c\'è amore più sincero dell\'amore per il cibo.', author: 'George Bernard Shaw' },
  { text: 'Le persone che amano mangiare sono sempre le persone migliori.', author: 'Julia Child' },
  { text: 'Per essere un buon cuoco bisogna avere amore per il buono, amore per il lavoro duro e amore per il creare.', author: 'Julia Child' },
];

let _quoteTimer = null;
let _quoteIndex = 0;

function startQuoteRotation() {
  function cycle() {
    const el     = document.getElementById('dashQuote');
    const author = document.getElementById('dashQuoteAuthor');
    if (!el) return;

    el.style.opacity     = '0';
    author.style.opacity = '0';

    setTimeout(() => {
      let next;
      do { next = Math.floor(Math.random() * QUOTES.length); } while (next === _quoteIndex && QUOTES.length > 1);
      _quoteIndex = next;
      const q = QUOTES[_quoteIndex];
      el.textContent     = q.text;
      author.textContent = q.author ? `— ${q.author}` : '';
      el.style.opacity     = '1';
      author.style.opacity = '1';
      _quoteTimer = setTimeout(cycle, 6000 + Math.random() * 4000);
    }, 500);
  }

  _quoteTimer = setTimeout(cycle, 6000 + Math.random() * 4000);
}

/* ---------- helper UI ---------- */
function setActiveLink(text) {
  document.querySelectorAll('.sidebar .nav-link').forEach(a => {
    const active = a.textContent.trim() === text;
    a.classList.toggle('active', active);
  });
  const crumb = document.getElementById('crumbPath');
  if (crumb) crumb.innerHTML = `Minoa / <b>${text}</b>`;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '../login/login.html';
}

/* ---------- sidebar mobile toggle ---------- */
function initSidebarToggle() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('btnHamburger');
  if (!sidebar || !overlay || !hamburger) return;

  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('visible'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }

  hamburger.addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar()
  );
  overlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.nav-link').forEach(a =>
    a.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); })
  );
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const u = localStorage.getItem('username');
  if (u) document.getElementById('userIcon').textContent = u[0].toUpperCase();
  initSidebarToggle();
  loadDashboard();
});

/* ---------- Dashboard ---------- */
export async function loadDashboard() {
  const { apiFetch, BASE_URL } = await import('../utils/utils.js');

  document.getElementById('mainContent').innerHTML = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <div class="page-sub">Panoramica della sala e degli eventi in programma.</div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-label">Eventi del mese</div>
        <div class="stat-value" id="stat-eventi-mese">…</div>
        <div class="stat-trend" id="stat-eventi-mese-label"></div>
      </div>
      <div class="stat">
        <div class="stat-label">Coperti questo mese</div>
        <div class="stat-value" id="stat-coperti">…</div>
      </div>
      <div class="stat">
        <div class="stat-label">Camerieri attivi</div>
        <div class="stat-value" id="stat-camerieri">…</div>
      </div>
      <div class="stat">
        <div class="stat-label">Prossimo evento</div>
        <div class="stat-value" id="stat-prossimo" style="font-size:28px;line-height:1.2">…</div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-lg-8">
        <div class="card card-minoa">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="m-0">Prossimi eventi</h3>
            <button class="btn btn-outline-secondary btn-sm" onclick="loadEventi()">Vedi tutti</button>
          </div>
          <div id="dashboard-eventi-list"><p class="muted mb-0">Caricamento…</p></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card card-minoa">
          <div class="stat-label mb-2">Aforisma</div>
          <div id="dashQuote" class="editorial-quote">La buona sala si vede nei dettagli prima che nei piatti.</div>
          <div id="dashQuoteAuthor" class="muted mt-2" style="font-size:11px;text-align:right;min-height:1em"></div>
        </div>
      </div>
    </div>
  `;
  setActiveLink('Dashboard');
  startQuoteRotation();

  const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const now   = new Date();
  const thisM = now.getMonth();
  const thisY = now.getFullYear();

  const fmtDate = d => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  };

  try {
    const [events, male, female, secondary] = await Promise.all([
      apiFetch(`${BASE_URL}/api/v1/events`).then(r => r.json()),
      apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=MALE`).then(r => r.json()),
      apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=FEMALE`).then(r => r.json()),
      apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=SECONDARY`).then(r => r.json()),
    ]);

    const eventiMese = events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === thisM && d.getFullYear() === thisY;
    });

    const coperiMese = eventiMese.reduce((sum, e) => sum + (e.diners || 0), 0);

    const oggi = now.toISOString().split('T')[0];
    const futuri = events
      .filter(e => e.date >= oggi)
      .sort((a, b) => a.date.localeCompare(b.date));

    const prossimo = futuri[0];

    document.getElementById('stat-eventi-mese').textContent = eventiMese.length;
    document.getElementById('stat-eventi-mese-label').textContent = MESI[thisM] + ' ' + thisY;
    document.getElementById('stat-coperti').textContent = coperiMese;
    document.getElementById('stat-camerieri').textContent = male.length + female.length + secondary.length;

    if (prossimo) {
      document.getElementById('stat-prossimo').innerHTML =
        `<span style="font-size:32px">${fmtDate(prossimo.date)}</span>
         <div style="font-size:13px;color:var(--ink-3);margin-top:4px">${prossimo.name}</div>`;
    } else {
      document.getElementById('stat-prossimo').textContent = '—';
    }

    const list = document.getElementById('dashboard-eventi-list');
    if (futuri.length === 0) {
      list.innerHTML = '<p class="muted mb-0">Nessun evento in programma.</p>';
    } else {
      list.innerHTML = futuri.slice(0, 5).map(e => `
        <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--border-soft)">
          <div>
            <div style="font-weight:500;font-size:13px">${e.name}</div>
            <div class="muted" style="font-size:12px">${e.eventstype} · ${e.eventLocation} · ${e.mealType}</div>
          </div>
          <span class="chip">${fmtDate(e.date)}</span>
        </div>`).join('');
    }
  } catch {
    ['stat-eventi-mese','stat-coperti','stat-camerieri','stat-prossimo'].forEach(id => {
      document.getElementById(id).textContent = '!';
    });
  }
}

/* ---------- Squadra ---------- */
export async function loadSquadra() {
  const html = await fetch('../squadra/squadra.html').then(r => r.text());
  document.getElementById('mainContent').innerHTML = html;

  const btn = document.getElementById('btn-modifica-ultimi');
  if (btn) {
    btn.addEventListener('click', () =>
      Promise.all([
        fetch('../modals/modificaUltimiModal.html').then(r => r.text()),
        import('../modals/modificaUltimiModal.js'),
      ]).then(([mHtml, mod]) => {
        const c = document.createElement('div');
        c.innerHTML = mHtml;
        document.body.appendChild(c);
        mod.initModificaUltimoModal();
      }),
    );
  }

  const mod = await import('../squadra/squadra.js');
  mod.initSquadra();
  setActiveLink('Squadra');
}

/* ---------- Eventi ---------- */
export async function loadEventi() {
  const html = await fetch('../eventi/eventi.html').then(r => r.text());
  document.getElementById('mainContent').innerHTML = html;

  let firstLoad = false;
  if (!document.getElementById('createEventModal')) {
    firstLoad = true;
    const [createHtml, splitHtml] = await Promise.all([
      fetch('../modals/createEventModal.html').then(r => r.text()),
      fetch('../modals/shiftEditModal.html').then(r => r.text()),
    ]);
    document.body.insertAdjacentHTML('beforeend', createHtml + splitHtml);
  }

  if (firstLoad) {
    await import('../modals/createEventModal.js');
    await import('../modals/shiftEditModal.js');
  }

  document.getElementById('btn-add-event')
    .addEventListener('click', () => {
      if (typeof resetEventForm === 'function') resetEventForm();
    });

  const mod = await import('../eventi/eventi.js');
  mod.initEventi();
  setActiveLink('Eventi');
}

/* ---------- Resoconto mensile ---------- */
export async function loadResoconto() {
  const BASE_URL = (await import('../utils/utils.js')).BASE_URL;
  const { apiFetch } = await import('../utils/utils.js');

  const groups = ['MALE', 'FEMALE', 'SECONDARY'];
  const allWaiters = (await Promise.all(
    groups.map(g => apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=${g}`).then(r => r.json()))
  )).flat();

  const waiterOptions = allWaiters
    .map(w => `<option value="${w.id}">${w.name} ${w.surname} (${w.belongingGroup})</option>`)
    .join('');

  const now = new Date();

  document.getElementById('mainContent').innerHTML = `
    <div class="page-head">
      <div>
        <h1>Resoconto</h1>
        <div class="page-sub">Partecipazione mensile dei camerieri agli eventi.</div>
      </div>
      <button class="btn btn-outline-secondary d-print-none" onclick="window.print()">
        <i class="bi bi-printer"></i> Stampa PDF
      </button>
    </div>

    <div class="card card-minoa mb-4 d-print-none">
      <div class="row g-3 align-items-end">
        <div class="col-auto">
          <label class="form-label">Cameriere</label>
          <select id="resocontoWaiter" class="form-select" style="min-width:220px">
            <option value="">-- seleziona --</option>
            ${waiterOptions}
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label">Mese</label>
          <select id="resocontoMonth" class="form-select" style="width:150px">
            <option value="">Tutti</option>
            <option value="1">Gennaio</option><option value="2">Febbraio</option>
            <option value="3">Marzo</option><option value="4">Aprile</option>
            <option value="5">Maggio</option><option value="6">Giugno</option>
            <option value="7">Luglio</option><option value="8">Agosto</option>
            <option value="9">Settembre</option><option value="10">Ottobre</option>
            <option value="11">Novembre</option><option value="12">Dicembre</option>
          </select>
        </div>
        <div class="col-auto">
          <label class="form-label">Anno</label>
          <input id="resocontoYear" type="number" class="form-control" value="${now.getFullYear()}" min="2020" max="2099" style="width:100px">
        </div>
        <div class="col-auto">
          <button id="btnGeneraResoconto" class="btn btn-accent">
            <i class="bi bi-search"></i> Genera
          </button>
        </div>
      </div>
    </div>

    <div id="resocontoResult"></div>
  `;

  document.getElementById('btnGeneraResoconto').addEventListener('click', async () => {
    const waiterId = document.getElementById('resocontoWaiter').value;
    if (!waiterId) { alert('Seleziona un cameriere.'); return; }

    const month = document.getElementById('resocontoMonth').value;
    const year  = document.getElementById('resocontoYear').value;
    const waiter = allWaiters.find(w => String(w.id) === waiterId);

    let url = `${BASE_URL}/api/v1/events/by-waiter/${waiterId}`;
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year)  params.push(`year=${year}`);
    if (params.length) url += '?' + params.join('&');

    const result = document.getElementById('resocontoResult');
    result.innerHTML = '<p class="muted">Caricamento…</p>';

    try {
      const events = await apiFetch(url).then(r => r.json());
      const MESI = ['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
      const periodoLabel = month && year ? `${MESI[+month]} ${year}`
                         : year ? `${year}`
                         : month ? MESI[+month]
                         : 'Tutti i periodi';

      if (events.length === 0) {
        result.innerHTML = `<div class="alert alert-warning">Nessun evento trovato per il periodo selezionato.</div>`;
        return;
      }

      const rows = events.map(e => {
        const d = new Date(e.date);
        const fd = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        return `<tr>
          <td>${fd}</td>
          <td>${e.name}</td>
          <td>${e.eventstype}</td>
          <td>${e.mealType}</td>
          <td>${e.eventLocation}</td>
        </tr>`;
      }).join('');

      result.innerHTML = `
        <div class="d-print-block">
          <div style="margin-bottom:20px">
            <div class="stat-label">Cameriere</div>
            <div style="font-size:22px;font-weight:500">${waiter.name} ${waiter.surname}</div>
          </div>
          <div style="margin-bottom:16px">
            <div class="stat-label">Periodo</div>
            <div>${periodoLabel}</div>
          </div>
          <div class="chip accent mb-4">Totale eventi: ${events.length}</div>
          <table class="table" style="font-size:13px">
            <thead>
              <tr>
                <th>Data</th><th>Nome Evento</th><th>Tipo</th><th>Pasto</th><th>Sede</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:24px;font-size:11px;color:var(--ink-4)" class="d-none d-print-block">
            Generato il ${new Date().toLocaleDateString('it-IT')} — Minoa gestionale
          </div>
        </div>`;
    } catch (err) {
      result.innerHTML = `<div class="alert alert-danger">Errore: ${err.message}</div>`;
    }
  });

  setActiveLink('Resoconto');
}

Object.assign(window, { loadDashboard, loadSquadra, loadEventi, loadResoconto, logout });
