/* eslint-env browser */

/* ---------- helper UI ---------- */
function setActiveLink(text) {
  document.querySelectorAll('.nav-link').forEach(a => {
    const active = a.textContent.trim() === text;
    a.classList.toggle('active',     active);
    a.classList.toggle('link-dark', !active);
  });
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
  loadDashboard();                                          // pagina iniziale
});

/* ---------- Dashboard ---------- */
export function loadDashboard() {
  document.getElementById('mainContent').innerHTML =
    '<h1>Dashboard</h1><p>Questa è la tua area riservata.</p>';
  setActiveLink('Dashboard');
}

/* ---------- Squadra ---------- */
export async function loadSquadra() {
  /* 1. HTML della pagina */
  const html = await fetch('../squadra/squadra.html').then(r => r.text());
  document.getElementById('mainContent').innerHTML = html;

  /* 2. Modale “Ultimi a lavorare” (come prima) */
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

  /* 3. Logica JS della sezione (richiamata ad **ogni** click) */
  const mod = await import('../squadra/squadra.js');
  mod.initSquadra();

  setActiveLink('Squadra');
}

/* ---------- Eventi ---------- */
export async function loadEventi() {
  /* 1. HTML della pagina */
  const html = await fetch('../eventi/eventi.html').then(r => r.text());
  document.getElementById('mainContent').innerHTML = html;

  /* 2. Inietto le due modali (una sola volta) */
  const [createHtml, splitHtml] = await Promise.all([
    fetch('../modals/createEventModal.html').then(r => r.text()),
    fetch('../modals/shiftEditModal.html').then(r => r.text()),
  ]);
  document.body.insertAdjacentHTML('beforeend', createHtml + splitHtml);

  /* 3. Script della modale split */
  await import('../modals/shiftEditModal.js');

  /* 4. Logica JS della sezione */
  const mod = await import('../eventi/eventi.js');
  mod.initEventi();

  setActiveLink('Eventi');
}

/* ---------- link usati nel markup (onclick="…") ---------- */
Object.assign(window, { loadDashboard, loadSquadra, loadEventi, logout });
