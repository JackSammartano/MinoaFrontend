/* eslint-env browser */
export function openShiftEditModal(eventId) {
  const token = localStorage.getItem('token');
  if (!token) return;

  const modalEl      = document.getElementById('shiftEditModal');
  const modal        = new bootstrap.Modal(modalEl);
  const splitChk     = modalEl.querySelector('#splitShiftCheckbox');
  const splitForm    = modalEl.querySelector('#splitShiftForm');
  const principalFrm = modalEl.querySelector('#principalEventForm');
  const secondFrm    = modalEl.querySelector('#secondEventForm');
  const form         = modalEl.querySelector('#shiftEditForm');

  /* ── reset ───────────────────────────────────────────── */
  splitChk.checked = false;
  splitForm.classList.add('d-none');
  principalFrm.innerHTML = '';
  secondFrm.innerHTML    = '';

  /* ── carico dati evento + camerieri ──────────────────── */
  Promise.all([
    fetch(`http://localhost:8080/api/v1/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    fetch(`http://localhost:8080/api/v1/events/${eventId}/waiters`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  ])
  .then(([event, waiters]) => {
    principalFrm.innerHTML = renderEventForm(event,  waiters, 'principal');
    secondFrm.innerHTML    = renderEventForm(null,   waiters, 'second');

    /* attivo la logica di selezione camerieri */
    setupWaiterSelector('principal');
    setupWaiterSelector('second');

    modal.show();
  });

  /* ── toggle split ────────────────────────────────────── */
  splitChk.onchange = () =>
    splitForm.classList.toggle('d-none', !splitChk.checked);

  /* ── submit ──────────────────────────────────────────── */
  form.onsubmit = e => {
    e.preventDefault();
    if (!splitChk.checked) { modal.hide(); return; }

    const body = {
      principalEventId: eventId,
      principalEvent:   extractEventData('principal'),
      secondEvent:      extractEventData('second'),
      waitersForPrincipalEvent: extractWaiters('principal'),
      waitersForSecondEvent:    extractWaiters('second'),
    };

    fetch('http://localhost:8080/api/v1/events/split', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    .then(r => { if (!r.ok) throw new Error('Errore durante la divisione del turno.'); })
    .then(() => { modal.hide(); location.reload(); })
    .catch(err => alert(err.message));
  };
}

/* ------------------------------------------------------------------
   1. HTML dei form evento
------------------------------------------------------------------ */
function renderEventForm(event, waiters, p) {
  const opt = waiters
    .map(w => `<option value="${w.name}|${w.surname}">${w.name} ${w.surname}</option>`)
    .join('');

  return `
    <div class="mb-3">
      <label class="form-label" for="${p}Name">Nome Evento</label>
      <input class="form-control" id="${p}Name" value="${event?.name ?? ''}" />
    </div>
    <div class="mb-3">
      <label class="form-label" for="${p}Date">Data</label>
      <input type="date" class="form-control" id="${p}Date" value="${event?.date ?? ''}" />
    </div>
<div class="mb-3">
  <label class="form-label" for="${p}MealType">Fascia oraria</label>
  <select class="form-select" id="${p}MealType">
    <option value="MATTINA" ${event?.mealType === 'MATTINA' ? 'selected' : ''}>Mattina</option>
    <option value="SERA"    ${event?.mealType === 'SERA'    ? 'selected' : ''}>Sera</option>
  </select>
</div>
<div class="mb-3">
  <label class="form-label" for="${p}EventLocation">Location</label>
  <select class="form-select" id="${p}EventLocation">
    <option value="MINOA"    ${event?.eventLocation === 'MINOA'    ? 'selected' : ''}>Minoa</option>
    <option value="COLORADO" ${event?.eventLocation === 'COLORADO' ? 'selected' : ''}>Colorado</option>
    <option value="CATERING" ${event?.eventLocation === 'CATERING' ? 'selected' : ''}>Catering</option>
  </select>
</div>
<div class="mb-3">
  <label class="form-label" for="${p}EventType">Tipo Evento</label>
  <select class="form-select" id="${p}EventType">
    <option value="MATRIMONIO" ${event?.eventstype === 'MATRIMONIO' ? 'selected' : ''}>Matrimonio</option>
    <option value="BANCHETTO"  ${event?.eventstype === 'BANCHETTO'  ? 'selected' : ''}>Banchetto</option>
  </select>
</div>
    <div class="mb-3">
      <label class="form-label" for="${p}Diners">Coperti</label>
      <input type="number" class="form-control" id="${p}Diners" value="${event?.diners ?? ''}" />
    </div>
    <!-- NUOVA UX CAMERIERI -->
    <div class="mb-3">
      <label class="form-label" for="${p}WaiterSelect">Camerieri disponibili</label>
      <select class="form-select waiter-select" id="${p}WaiterSelect">
        <option value="">-- seleziona --</option>
        <option value="__ALL__">-- seleziona tutti --</option>
        ${opt}
      </select>
    </div>
    <ul class="list-group mb-3" id="${p}SelectedWaiters"></ul>`;
}

/* ------------------------------------------------------------------
   Gestione condivisa delle due tendine “camerieri disponibili”
------------------------------------------------------------------ */
function setupWaiterSelector(prefix) {
  const select   = document.getElementById(`${prefix}WaiterSelect`);
  const list     = document.getElementById(`${prefix}SelectedWaiters`);
  const selects  = document.querySelectorAll('.waiter-select');      // ← entrambe

select.onchange = () => {
  const val = select.value;
  if (!val) return;                                // "-- seleziona --"

  /* ------------------ SELEZIONA TUTTI ------------------ */
  if (val === '__ALL__') {
    // raccolgo tutte le opzioni “normali” ancora presenti
    const remaining = Array.from(select.options)
      .filter(o => o.value && o.value !== '__ALL__')
      .map(o => o.value);

    remaining.forEach(v => addWaiter(v));          // le aggiungo tutte
    return;
  }

  /* ------------------ SELEZIONE SINGOLA ---------------- */
  addWaiter(val);
};

/* helper interno: aggiunge un cameriere e sincronizza le tendine */
function addWaiter(value) {
  const [name, surname] = value.split('|');

  /* 1. rimuovo l’opzione da entrambe le tendine */
  selects.forEach(s => s.querySelector(`option[value="${value}"]`)?.remove());

  /* 2. creo il badge */
  const li = document.createElement('li');
  li.className =
    'list-group-item d-flex justify-content-between align-items-center';
  li.textContent = `${name} ${surname}`;

  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-danger';
  btn.innerHTML = '<i class="bi bi-x"></i>';
  btn.onclick = () => {
    // rimetto l’opzione in fondo a entrambe le tendine
    selects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = `${name} ${surname}`;
      s.appendChild(opt);
    });
    li.remove();
  };

  li.appendChild(btn);
  list.appendChild(li);
};

}

/* ------------------------------------------------------------------
   3. Estrattori dati per submit
------------------------------------------------------------------ */
function extractEventData(p) {
  return {
    name:          document.getElementById(`${p}Name`).value,
    date:          document.getElementById(`${p}Date`).value,
    mealType:      document.getElementById(`${p}MealType`).value,
    eventLocation: document.getElementById(`${p}EventLocation`).value,
    eventstype:    document.getElementById(`${p}EventType`).value,
    diners:        +document.getElementById(`${p}Diners`).value,
  };
}

function extractWaiters(prefix) {
  return Array.from(document.querySelectorAll(`#${prefix}SelectedWaiters li`))
    .map(li => {
      const [name, surname] = li.firstChild.textContent.split(' ');
      return { name, surname };
    });
}
