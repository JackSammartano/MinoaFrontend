/* eslint-env browser */

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

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const u = localStorage.getItem('username');
  if (u) document.getElementById('userIcon').textContent = u[0].toUpperCase();
  loadDashboard();
});

/* ---------- Dashboard ---------- */
export function loadDashboard() {
  document.getElementById('mainContent').innerHTML = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <div class="page-sub">Panoramica della sala e degli eventi in programma.</div>
      </div>
      <div>
        <button class="btn btn-accent" onclick="loadEventi()"><i class="bi bi-plus-lg"></i> Nuovo evento</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-label">Eventi del mese</div>
        <div class="stat-value">—</div>
        <div class="stat-trend">Dati in caricamento</div>
      </div>
      <div class="stat">
        <div class="stat-label">Coperti totali</div>
        <div class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Camerieri attivi</div>
        <div class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Prossimo evento</div>
        <div class="stat-value">—</div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-lg-8">
        <div class="card card-minoa">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="m-0">Prossimi eventi</h3>
            <button class="btn btn-outline-secondary btn-sm" onclick="loadEventi()">Vedi tutti</button>
          </div>
          <p class="muted mb-0">Seleziona "Eventi" per visualizzare la lista completa con filtri e gestione turni.</p>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card card-minoa">
          <div class="stat-label mb-2">Aforisma</div>
          <div class="editorial-quote">La buona sala si vede nei dettagli prima che nei piatti.</div>
        </div>
      </div>
    </div>
  `;
  setActiveLink('Dashboard');
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

Object.assign(window, { loadDashboard, loadSquadra, loadEventi, logout });
