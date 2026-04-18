import { apiFetch, BASE_URL } from '../utils/utils.js';

export function initWaiterDetailModal(waiterId) {

  /* ── tab switching ── */
  document.querySelectorAll('#waiterDetailTabs .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#waiterDetailTabs .nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tabTurni').style.display  = tab === 'turni' ? '' : 'none';
      document.getElementById('tabCambi').style.display  = tab === 'cambi'  ? '' : 'none';
    });
  });

  /* ── TAB TURNI ── */
  let eventsTable;

  apiFetch(`${BASE_URL}/api/v1/events/by-waiter/${waiterId}`)
    .then(res => res.json())
    .then(data => {
      eventsTable = new Tabulator('#waiterEventsTable', {
        data,
        layout: 'fitColumns',
        placeholder: 'Nessun evento trovato',
        pagination: 'local',
        paginationSize: 10,
        paginationButtonCount: 5,
        initialSort: [{ column: 'date', dir: 'desc' }],
        columns: [
          { title: 'Nome Evento', field: 'name' },
          { title: 'Data',        field: 'date', formatter: dateFormatter },
          { title: 'Tipo',        field: 'eventstype' },
          { title: 'Coperti',     field: 'diners' },
          { title: 'Tipo Pasto',  field: 'mealType' },
          { title: 'Location',    field: 'eventLocation' },
        ],
      });

      const applyDetailFilters = () => {
        const m = document.getElementById('waiterDetailFilterMonth').value;
        const y = document.getElementById('waiterDetailFilterYear').value;
        eventsTable.clearFilter();
        if (m || y) {
          eventsTable.addFilter(row => {
            const d = new Date(row.date);
            if (m && String(d.getMonth() + 1).padStart(2, '0') !== m) return false;
            if (y && String(d.getFullYear()) !== y) return false;
            return true;
          });
        }
      };
      document.getElementById('waiterDetailFilterMonth')?.addEventListener('input', applyDetailFilters);
      document.getElementById('waiterDetailFilterYear')?.addEventListener('input', applyDetailFilters);
    })
    .catch(() => {
      document.getElementById('waiterEventsTable').innerHTML =
        '<div class="alert alert-danger">Errore nel caricamento turni.</div>';
    });

  /* ── TAB CAMBI ── */
  apiFetch(`${BASE_URL}/api/v1/waiters/${waiterId}/shift-changes`)
    .then(res => res.json())
    .then(data => {
      new Tabulator('#waiterChangesTable', {
        data,
        layout: 'fitColumns',
        placeholder: 'Nessun cambio registrato',
        pagination: 'local',
        paginationSize: 10,
        paginationButtonCount: 5,
        initialSort: [{ column: 'eventDate', dir: 'desc' }],
        columns: [
          {
            title: 'Ruolo',
            field: 'role',
            hozAlign: 'center',
            formatter: cell => {
              const v = cell.getValue();
              const cls = v === 'DATO' ? 'success' : 'accent';
              return `<span class="chip ${cls}">${v}</span>`;
            },
          },
          { title: 'Data',        field: 'eventDate',      formatter: dateFormatter },
          { title: 'Evento',      field: 'eventName' },
          { title: 'Controparte', field: 'otherWaiterName' },
        ],
      });
    })
    .catch(() => {
      document.getElementById('waiterChangesTable').innerHTML =
        '<div class="alert alert-danger">Errore nel caricamento cambi.</div>';
    });

  function dateFormatter(cell) {
    const d = new Date(cell.getValue());
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
