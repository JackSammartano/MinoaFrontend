/* eslint-env browser */
import { apiFetch, BASE_URL } from '../utils/utils.js';

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
    apiFetch(`${BASE_URL}/api/v1/events/${eventId}`).then(r => r.json()),
    apiFetch(`${BASE_URL}/api/v1/events/${eventId}/waiters`).then(r => r.json()),
  ])
  .then(([event, waiters]) => {
    principalFrm.innerHTML = renderEventForm(event,  waiters, 'principal');
    secondFrm.innerHTML    = renderEventForm(null,   waiters, 'second');

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

    /* ── caso senza split: salva modifiche evento principale ── */
    if (!splitChk.checked) {
      const updated = extractEventData('principal');
      apiFetch(`${BASE_URL}/api/v1/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).then(r => {
        if (r.ok) {
          modal.hide();
          if (typeof loadEventi === 'function') loadEventi();
        } else {
          alert('Errore durante la modifica dell\'evento.');
        }
      });
      return;
    }

    /* ── caso split: validazione ────────────────────────── */
    const principalWaiters = extractWaiters('principal');
    const secondWaiters    = extractWaiters('second');
    const secondDate       = document.getElementById('secondDate')?.value;

    if (principalWaiters.length === 0) {
      alert('Assegnare almeno un cameriere all\'evento principale.');
      return;
    }
    if (!secondDate) {
      alert('Inserire la data per il secondo evento.');
      return;
    }

    const body = {
      principalEventId: eventId,
      principalEvent:   extractEventData('principal'),
      secondEvent:      extractEventData('second'),
      waitersForPrincipalEvent: principalWaiters,
      waitersForSecondEvent:    secondWaiters,
    };

    apiFetch(`${BASE_URL}/api/v1/events/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(r => {
      if (!r.ok) throw new Error('Errore durante la divisione del turno.');
    })
    .then(() => {
      modal.hide();
      if (typeof loadEventi === 'function') loadEventi();
    })
    .catch(err => alert(err.message));
  };
}

/* ------------------------------------------------------------------
   HTML dei form evento
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
   Gestione selezione camerieri
   Usa data-value="Nome|Cognome" per evitare problemi con nomi composti
------------------------------------------------------------------ */
function setupWaiterSelector(prefix) {
  const select  = document.getElementById(`${prefix}WaiterSelect`);
  const list    = document.getElementById(`${prefix}SelectedWaiters`);
  const selects = document.querySelectorAll('.waiter-select');

  select.onchange = () => {
    const val = select.value;
    if (!val) return;

    if (val === '__ALL__') {
      Array.from(select.options)
        .filter(o => o.value && o.value !== '__ALL__')
        .map(o => o.value)
        .forEach(v => addWaiter(v));
      return;
    }

    addWaiter(val);
  };

  function addWaiter(value) {
    const [name, surname] = value.split('|');

    /* rimuovo l'opzione da entrambe le tendine */
    selects.forEach(s => s.querySelector(`option[value="${value}"]`)?.remove());

    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.textContent = `${name} ${surname}`;
    li.dataset.value = value; // ← chiave del fix: preserva nome|cognome originale

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-outline-danger';
    btn.innerHTML = '<i class="bi bi-x"></i>';
    btn.onclick = () => {
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
  }
}

/* ------------------------------------------------------------------
   Estrattori dati per submit
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
      const [name, surname] = li.dataset.value.split('|'); // legge da data-value, non dal testo
      return { name, surname };
    });
}
