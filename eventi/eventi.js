/* eslint-env browser */
import { apiFetch, BASE_URL, withLoading } from '../utils/utils.js';
import { openShiftEditModal } from '../modals/shiftEditModal.js';
import { openSwapWaiterModal } from '../modals/swapWaiterModal.js';

export function initEventi() {
  /* ---------- token / redirect ---------- */
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '../login/login.html'; return; }

  const EVENTS_URL = `${BASE_URL}/api/v1/events`;

  /* ---------- distruggi Tabulator precedente, se presente ---------- */
  const oldTable = Tabulator.findTable('#eventTable')[0];
  if (oldTable) oldTable.destroy();

  /* ---------- Tabella ---------- */
  apiFetch(EVENTS_URL)
    .then(r => r.json())
    .then(data => {
      new Tabulator('#eventTable', {
        data,
        layout: 'fitColumns',
        placeholder: 'Nessun evento trovato.',
        autoResize: true,
        pagination: 'local',
        paginationSize: 15,
        paginationButtonCount: 5,
        initialSort: [{ column: 'date', dir: 'desc' }],
        columns: [
          {
            title: '',
            hozAlign: 'center',
            formatter(cell) {
              const { id } = cell.getRow().getData();
              return `
                <button class="btn btn-sm btn-outline-secondary me-1 view-btn"   data-id="${id}">
                  <i class="bi bi-people"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary  me-1 edit-btn"   data-id="${id}">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger           delete-btn" data-id="${id}">
                  <i class="bi bi-trash3"></i>
                </button>`;
            },
            cellClick(e) {
              const btn = e.target.closest('button');
              if (!btn) return;
              const { id } = btn.dataset;
              if (btn.classList.contains('view-btn'))   showWaiters(+id);
              if (btn.classList.contains('edit-btn'))   openEditModal(+id);
              if (btn.classList.contains('delete-btn')) deleteEvent(+id);
            },
          },
          { title: 'Nome',        field: 'name' },
          { title: 'Data',        field: 'date', formatter: dateFormatter,
            sorter: (a, b) => new Date(a) - new Date(b) },
          { title: 'Tipo Evento', field: 'eventstype' },
          { title: 'Coperti',     field: 'diners' },
          { title: 'Tipo Pasto',  field: 'mealType' },
          { title: 'Location',    field: 'eventLocation' },
        ],
      });
    }).then(() => {
      const table = Tabulator.findTable('#eventTable')[0];
      if (table) setupFilters(table);
    });

  /* ---------- filtri ---------- */
  function applyFilters(table) {
    const type     = document.getElementById('filterEventType')?.value ?? '';
    const location = document.getElementById('filterLocation')?.value ?? '';
    const month    = document.getElementById('filterMonth')?.value ?? '';
    const year     = document.getElementById('filterYear')?.value ?? '';

    table.clearFilter();

    if (type)     table.addFilter('eventstype',    '=', type);
    if (location) table.addFilter('eventLocation', '=', location);
    if (month || year) {
      table.addFilter(row => {
        const d  = new Date(row.date);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear());
        if (month && mm !== month) return false;
        if (year  && yy !== year)  return false;
        return true;
      });
    }
  }

  function setupFilters(table) {
    ['filterEventType', 'filterLocation', 'filterMonth'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', () => applyFilters(table))
    );
    document.getElementById('filterYear')
      ?.addEventListener('input', () => applyFilters(table));

    document.getElementById('btnClearFilters')?.addEventListener('click', () => {
      document.getElementById('filterEventType').value = '';
      document.getElementById('filterLocation').value  = '';
      document.getElementById('filterMonth').value     = '';
      document.getElementById('filterYear').value      = '';
      table.clearFilter();
    });
  }

  /* ---------- helper ---------- */
  function dateFormatter(cell) {
    const d = new Date(cell.getValue());
    return `${d.getDate().toString().padStart(2, '0')}/${
      (d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  /* ---------- waiters / turno ---------- */
  function showWaiters(eventId) {
    const container = document.getElementById('eventDetails');
    container.innerHTML = '<p>Caricamento turno...</p>';

    apiFetch(`${EVENTS_URL}/${eventId}`)
      .then(r => r.json())
      .then(event =>
        apiFetch(`${EVENTS_URL}/${eventId}/waiters`)
          .then(r => r.json())
          .then(waiters => ({ event, waiters })),
      )
      .then(({ event, waiters }) => {
        const d  = new Date(event.date);
        const fd = `${d.getDate().toString().padStart(2, '0')}/${
                   (d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        const header = `
          <div class="d-flex justify-content-between align-items-center">
            <h5>Turno del ${fd} ${event.mealType} (${event.eventLocation})</h5>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" id="btn-share-shift-${event.id}">
                <i class="bi bi-share"></i> Condividi
              </button>
              <button class="btn btn-sm btn-outline-primary" id="btn-edit-shift-${event.id}">
                <i class="bi bi-pencil-square"></i> Modifica Turno
              </button>
            </div>
          </div>`;

        if (waiters.length === 0) {
          container.innerHTML = `${header}
            <div class="alert alert-warning">Nessun turno per questo evento</div>
            <button class="btn btn-primary mt-2" onclick="createShift(${event.id})">Crea Turno</button>`;
        } else {
          const li = waiters.map(w => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>${w.name} ${w.surname}</span>
              <button class="btn btn-sm btn-outline-warning swap-btn"
                      data-id="${w.id}"
                      data-name="${w.name} ${w.surname}"
                      title="Sostituisci">
                <i class="bi bi-arrow-left-right"></i>
              </button>
            </li>`).join('');
          container.innerHTML = `${header}<ul class="list-group">${li}</ul>`;

          container.querySelectorAll('.swap-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              openSwapWaiterModal(
                event.id,
                parseInt(btn.dataset.id),
                btn.dataset.name,
                (msg) => {
                  alert(msg);
                  showWaiters(event.id);
                }
              );
            });
          });
        }

        const btnEdit = document.getElementById(`btn-edit-shift-${event.id}`);
        if (btnEdit) btnEdit.addEventListener('click', () =>
          openShiftEditModal(event.id, id => refreshEventAndWaiters(id))
        );

        const btnShare = document.getElementById(`btn-share-shift-${event.id}`);
        if (btnShare) btnShare.addEventListener('click', () => shareShift(event, btnShare));
      })
      .catch(err => {
        container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      });
  }

  /* ---------- refresh post-modal ---------- */
  function refreshEventAndWaiters(eventId) {
    const table = Tabulator.findTable('#eventTable')[0];
    if (!table) return;
    apiFetch(EVENTS_URL)
      .then(r => r.json())
      .then(data => table.replaceData(data))
      .then(() => showWaiters(eventId));
  }

  /* ---------- condividi turno ---------- */
  async function shareShift(event, btn) {
    const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

    const d        = new Date(event.date);
    const dataStr  = `${d.getDate()} ${MESI[d.getMonth()]}`;
    const orario   = event.mealType === 'MATTINA' ? 'mattina' : 'sera';

    const allEvents = Tabulator.findTable('#eventTable')[0]?.getData() ?? [];
    const sameSlot  = allEvents.filter(e => e.date === event.date && e.mealType === event.mealType);

    const slots = await Promise.all(
      sameSlot.map(async e => {
        const ws = await apiFetch(`${EVENTS_URL}/${e.id}/waiters`).then(r => r.json());
        return { event: e, waiters: ws };
      })
    );

    let text = `Turno del ${dataStr},\n`;
    slots.forEach((slot, i) => {
      const loc = slot.event.eventLocation.charAt(0) + slot.event.eventLocation.slice(1).toLowerCase();
      text += `\n${loc} ${orario}:\n`;
      text += slot.waiters.map(w => w.surname || `${w.name} ${w.surname}`).join('\n');
      if (i < slots.length - 1) text += '\n\n---------------------';
    });

    text += '\n\nSi prega di confermare.';

    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Copiato!';
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
    } catch {
      alert('Impossibile accedere agli appunti. Richiede HTTPS o localhost.');
    }
  }

  /* ---------- CRUD evento ---------- */
  function deleteEvent(id) {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;
    apiFetch(`${EVENTS_URL}/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          Tabulator.findTable('#eventTable')[0].deleteRow(id);
          document.getElementById('eventDetails').innerHTML = '';
        } else {
          alert('Errore durante l\'eliminazione');
        }
      });
  }

  window.createShift = function (eventId) {
    const btn = document.querySelector(`button[onclick="createShift(${eventId})"]`);
    const run = () => apiFetch(`${EVENTS_URL}/workshift/${eventId}`, { method: 'POST' })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        alert(data.message || (ok ? 'Turno creato con successo' : 'Errore nella creazione del turno'));
        if (ok) showWaiters(eventId);
      })
      .catch(err => {
        document.getElementById('eventDetails')
          .innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      });

    if (btn) withLoading(btn, run);
    else run();
  };

  function openEditModal(eventId) {
    apiFetch(`${EVENTS_URL}/${eventId}`)
      .then(r => r.json())
      .then(event => {
        document.getElementById('eventName').value           = event.name;
        document.getElementById('eventDate').value           = event.date;
        document.getElementById('eventType').value           = event.eventstype;
        document.getElementById('diners').value              = event.diners;
        document.getElementById('mealType').value            = event.mealType;
        document.getElementById('eventLocation').value       = event.eventLocation;
        document.getElementById('eventType').disabled        = true;
        document.getElementById('diners').disabled           = true;
        document.getElementById('createEventModalLabel').textContent = 'Modifica Evento';
        document.querySelector('#createEventForm button[type="submit"]').textContent = 'Salva';
        document.getElementById('createEventForm').dataset.editingId = event.id;
        new bootstrap.Modal('#createEventModal').show();
      });
  }
}
