/* eslint-env browser */
import { apiFetch, BASE_URL } from '../utils/utils.js';
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
        maxHeight: 500,
        placeholder: 'Nessun evento trovato.',
        autoResize: true,
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
        tableBuilt() { setupFilters(this); },
      });
    });

  /* ---------- filtri ---------- */
  function applyFilters(table) {
    const type     = document.getElementById('filterEventType').value;
    const location = document.getElementById('filterLocation').value;
    const month    = document.getElementById('filterMonth').value;
    const year     = document.getElementById('filterYear').value;

    const filters = [];
    if (type)     filters.push({ field: 'eventstype',    type: '=', value: type });
    if (location) filters.push({ field: 'eventLocation', type: '=', value: location });
    if (month || year) {
      filters.push(row => {
        const d = new Date(row.date);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear());
        if (month && mm !== month) return false;
        if (year  && yy !== year)  return false;
        return true;
      });
    }

    table.clearFilter();
    filters.forEach(f => {
      if (typeof f === 'function') table.addFilter(f);
      else table.addFilter(f.field, f.type, f.value);
    });
  }

  function setupFilters(table) {
    ['filterEventType', 'filterLocation', 'filterMonth', 'filterYear']
      .forEach(id => document.getElementById(id)
        ?.addEventListener('change', () => applyFilters(table)));

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
            <button class="btn btn-sm btn-outline-primary" id="btn-edit-shift-${event.id}">
              <i class="bi bi-pencil-square"></i> Modifica Turno
            </button>
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

        const btn = document.getElementById(`btn-edit-shift-${event.id}`);
        if (btn) btn.addEventListener('click', () => openShiftEditModal(event.id));
      })
      .catch(err => {
        container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      });
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
    apiFetch(`${EVENTS_URL}/workshift/${eventId}`, { method: 'POST' })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        alert(data.message || (ok ? 'Turno creato con successo' : 'Errore nella creazione del turno'));
        if (ok) showWaiters(eventId);
      })
      .catch(err => {
        document.getElementById('eventDetails')
          .innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      });
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
