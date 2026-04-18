/* eslint-env browser */
import { apiFetch, BASE_URL, withLoading } from '../utils/utils.js';

let _eventId = null;
let _allWaiters = [];

export function openShiftEditModal(eventId, onClose) {
  _eventId = eventId;

  const modalEl = document.getElementById('shiftEditModal');
  const modal   = new bootstrap.Modal(modalEl);

  if (typeof onClose === 'function') {
    modalEl.addEventListener('hidden.bs.modal', () => onClose(eventId), { once: true });
  }

  /* reset split */
  const splitChk = modalEl.querySelector('#splitShiftCheckbox');
  splitChk.checked = false;
  modalEl.querySelector('#splitShiftSection').classList.add('d-none');
  modalEl.querySelector('#principalEventForm').innerHTML = '';
  modalEl.querySelector('#secondEventForm').innerHTML    = '';

  /* fetch event + assigned waiters + all waiters */
  Promise.all([
    apiFetch(`${BASE_URL}/api/v1/events/${eventId}`).then(r => r.json()),
    apiFetch(`${BASE_URL}/api/v1/events/${eventId}/waiters`).then(r => r.json()),
    Promise.all(['MALE', 'FEMALE', 'SECONDARY'].map(g =>
      apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=${g}`).then(r => r.json())
    )).then(groups => groups.flat()),
  ])
  .then(([event, assigned, all]) => {
    _allWaiters = all;

    /* populate meta form */
    modalEl.querySelector('#shiftName').value     = event.name;
    modalEl.querySelector('#shiftDate').value     = event.date;
    modalEl.querySelector('#shiftMealType').value = event.mealType;
    modalEl.querySelector('#shiftLocation').value = event.eventLocation;
    modalEl.querySelector('#shiftType').value     = event.eventstype;
    modalEl.querySelector('#shiftDiners').value   = event.diners;

    /* waiter panel */
    renderAssignedWaiters(assigned);
    renderAddSelect(assigned);

    /* split section */
    modalEl.querySelector('#principalEventForm').innerHTML = renderSplitForm(event, 'principal');
    modalEl.querySelector('#secondEventForm').innerHTML    = renderSplitForm(null,  'second');
    setupSplitSelector('principal');
    setupSplitSelector('second');

    modal.show();
  })
  .catch(() => alert('Errore nel caricamento dati turno.'));

  /* ── meta save ──────────────────────────────────────────── */
  modalEl.querySelector('#shiftMetaForm').onsubmit = async e => {
    e.preventDefault();
    const btn  = modalEl.querySelector('#btnSaveMeta');
    const orig = btn.innerHTML;
    const body = {
      name:          modalEl.querySelector('#shiftName').value,
      date:          modalEl.querySelector('#shiftDate').value,
      mealType:      modalEl.querySelector('#shiftMealType').value,
      eventLocation: modalEl.querySelector('#shiftLocation').value,
      eventstype:    modalEl.querySelector('#shiftType').value,
      diners:        +modalEl.querySelector('#shiftDiners').value,
    };
    try {
      await withLoading(btn, async () => {
        const r = await apiFetch(`${BASE_URL}/api/v1/events/${eventId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.message || 'Errore nel salvataggio.');
        }
      });
      /* withLoading ha già ripristinato btn.innerHTML = orig, ora mostriamo feedback */
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Salvato';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  /* ── add waiter ─────────────────────────────────────────── */
  modalEl.querySelector('#btnAddWaiter').onclick = async () => {
    const waiterId = +modalEl.querySelector('#addWaiterSelect').value;
    if (!waiterId) return;
    const btn  = modalEl.querySelector('#btnAddWaiter');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    try {
      const r = await apiFetch(`${BASE_URL}/api/v1/events/${eventId}/waiters/${waiterId}`, { method: 'POST' });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        alert(errData.message || 'Errore nell\'aggiunta.');
        btn.disabled = false;
        btn.innerHTML = orig;
      } else {
        await refreshWaiterPanel();
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Aggiunto';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      }
    } catch {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  };

  /* ── split toggle ───────────────────────────────────────── */
  splitChk.onchange = () =>
    modalEl.querySelector('#splitShiftSection').classList.toggle('d-none', !splitChk.checked);

  /* ── split submit ───────────────────────────────────────── */
  modalEl.querySelector('#btnSplit').onclick = () => {
    const principalWaiters = extractSplitWaiters('principal');
    if (principalWaiters.length === 0) {
      alert('Assegnare almeno un cameriere all\'evento principale.');
      return;
    }

    const body = {
      principalEventId:         eventId,
      principalEvent:           extractSplitEventData('principal'),
      secondEvent:              extractSplitEventData('second'),
      waitersForPrincipalEvent: principalWaiters.map(w => ({ id: w.id, name: w.name, surname: w.surname })),
      waitersForSecondEvent:    extractSplitWaiters('second').map(w => ({ id: w.id, name: w.name, surname: w.surname })),
    };

    const btn = modalEl.querySelector('#btnSplit');
    withLoading(btn, () =>
      apiFetch(`${BASE_URL}/api/v1/events/split`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      .then(r => {
        if (!r.ok) throw new Error('Errore durante la divisione del turno.');
        modal.hide();
        if (typeof loadEventi === 'function') loadEventi();
      })
      .catch(err => alert(err.message))
    );
  };
}

/* ================================================================
   Waiter panel (sezione 2) — operazioni immediate
================================================================ */
function renderAssignedWaiters(assigned) {
  const list = document.getElementById('assignedWaitersList');
  if (assigned.length === 0) {
    list.innerHTML = '<li class="list-group-item muted" style="font-size:13px">Nessun cameriere assegnato.</li>';
    return;
  }
  list.innerHTML = assigned.map(w => `
    <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${w.id}">
      <span style="font-size:13px">${w.name} ${w.surname}</span>
      <button class="btn btn-sm btn-outline-danger remove-waiter-btn" data-id="${w.id}">
        <i class="bi bi-x-lg"></i>
      </button>
    </li>`).join('');

  list.querySelectorAll('.remove-waiter-btn').forEach(btn =>
    btn.addEventListener('click', () => removeWaiter(+btn.dataset.id))
  );
}

function renderAddSelect(assigned) {
  const assignedIds = new Set(assigned.map(w => w.id));
  const select      = document.getElementById('addWaiterSelect');
  const available   = _allWaiters.filter(w => !assignedIds.has(w.id));

  select.innerHTML = '<option value="">-- aggiungi cameriere --</option>' +
    available.map(w =>
      `<option value="${w.id}">${w.name} ${w.surname} (${w.belongingGroup})</option>`
    ).join('');
}

function refreshWaiterPanel() {
  return apiFetch(`${BASE_URL}/api/v1/events/${_eventId}/waiters`)
    .then(r => r.json())
    .then(assigned => {
      renderAssignedWaiters(assigned);
      renderAddSelect(assigned);
    });
}

function removeWaiter(waiterId) {
  const btn = document.querySelector(`#assignedWaitersList .remove-waiter-btn[data-id="${waiterId}"]`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }

  apiFetch(`${BASE_URL}/api/v1/events/${_eventId}/waiters/${waiterId}`, { method: 'DELETE' })
    .then(r => {
      if (r.ok) refreshWaiterPanel();
      else {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-x-lg"></i>'; }
        alert('Errore nella rimozione del cameriere.');
      }
    });
}

/* ================================================================
   Split section (sezione 3)
================================================================ */
function renderSplitForm(event, p) {
  const opts = _allWaiters.map(w =>
    `<option value="${w.id}">${w.name} ${w.surname} (${w.belongingGroup})</option>`
  ).join('');

  return `
    <div class="row g-2 mb-2">
      <div class="col-8">
        <label class="form-label">Nome</label>
        <input class="form-control form-control-sm" id="${p}Name" value="${event?.name ?? ''}" />
      </div>
      <div class="col-4">
        <label class="form-label">Data</label>
        <input type="date" class="form-control form-control-sm" id="${p}Date" value="${event?.date ?? ''}" />
      </div>
    </div>
    <div class="row g-2 mb-2">
      <div class="col">
        <label class="form-label">Orario</label>
        <select class="form-select form-select-sm" id="${p}MealType">
          <option value="MATTINA" ${event?.mealType === 'MATTINA' ? 'selected' : ''}>Mattina</option>
          <option value="SERA"    ${event?.mealType === 'SERA'    ? 'selected' : ''}>Sera</option>
        </select>
      </div>
      <div class="col">
        <label class="form-label">Location</label>
        <select class="form-select form-select-sm" id="${p}EventLocation">
          <option value="MINOA"    ${event?.eventLocation === 'MINOA'    ? 'selected' : ''}>Minoa</option>
          <option value="COLORADO" ${event?.eventLocation === 'COLORADO' ? 'selected' : ''}>Colorado</option>
          <option value="CATERING" ${event?.eventLocation === 'CATERING' ? 'selected' : ''}>Catering</option>
        </select>
      </div>
      <div class="col">
        <label class="form-label">Tipo</label>
        <select class="form-select form-select-sm" id="${p}EventType">
          <option value="MATRIMONIO" ${event?.eventstype === 'MATRIMONIO' ? 'selected' : ''}>Matrimonio</option>
          <option value="BANCHETTO"  ${event?.eventstype === 'BANCHETTO'  ? 'selected' : ''}>Banchetto</option>
        </select>
      </div>
      <div class="col">
        <label class="form-label">Coperti</label>
        <input type="number" class="form-control form-control-sm" id="${p}Diners" value="${event?.diners ?? ''}" />
      </div>
    </div>
    <div class="row g-2">
      <div class="col">
        <label class="form-label">Camerieri</label>
        <select class="form-select form-select-sm split-waiter-select" id="${p}WaiterSelect">
          <option value="">-- seleziona --</option>
          <option value="__ALL__">-- tutti --</option>
          ${opts}
        </select>
        <ul class="list-group mt-2" id="${p}SelectedWaiters"></ul>
      </div>
    </div>`;
}

function setupSplitSelector(prefix) {
  const select     = document.getElementById(`${prefix}WaiterSelect`);
  const list       = document.getElementById(`${prefix}SelectedWaiters`);
  const allSelects = () => document.querySelectorAll('.split-waiter-select');

  select.onchange = () => {
    const val = select.value;
    if (!val) return;

    if (val === '__ALL__') {
      Array.from(select.options)
        .filter(o => o.value && o.value !== '__ALL__')
        .map(o => +o.value)
        .forEach(id => addToSplitList(id));
      select.value = '';
      return;
    }

    addToSplitList(+val);
    select.value = '';
  };

  function addToSplitList(waiterId) {
    const waiter = _allWaiters.find(w => w.id === waiterId);
    if (!waiter) return;

    allSelects().forEach(s => s.querySelector(`option[value="${waiterId}"]`)?.remove());

    const li  = document.createElement('li');
    li.className    = 'list-group-item d-flex justify-content-between align-items-center py-1';
    li.dataset.id   = waiterId;
    li.dataset.name = waiter.name;
    li.dataset.surname = waiter.surname;
    li.innerHTML = `<span style="font-size:13px">${waiter.name} ${waiter.surname}</span>`;

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-outline-danger';
    btn.innerHTML = '<i class="bi bi-x"></i>';
    btn.onclick = () => {
      allSelects().forEach(s => {
        const opt = document.createElement('option');
        opt.value = waiterId;
        opt.textContent = `${waiter.name} ${waiter.surname} (${waiter.belongingGroup})`;
        s.appendChild(opt);
      });
      li.remove();
    };

    li.appendChild(btn);
    list.appendChild(li);
  }
}

function extractSplitWaiters(prefix) {
  return Array.from(document.querySelectorAll(`#${prefix}SelectedWaiters li`)).map(li => ({
    id:      +li.dataset.id,
    name:    li.dataset.name,
    surname: li.dataset.surname,
  }));
}

function extractSplitEventData(p) {
  return {
    name:          document.getElementById(`${p}Name`).value,
    date:          document.getElementById(`${p}Date`).value,
    mealType:      document.getElementById(`${p}MealType`).value,
    eventLocation: document.getElementById(`${p}EventLocation`).value,
    eventstype:    document.getElementById(`${p}EventType`).value,
    diners:        +document.getElementById(`${p}Diners`).value,
  };
}
