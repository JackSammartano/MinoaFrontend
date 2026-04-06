/* eslint-env browser */
import { apiFetch, BASE_URL } from '../utils/utils.js';

export function initSquadra() {
  /* ---------- token / redirect ---------- */
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '../login/login.html'; return; }

  const WAITERS_URL = `${BASE_URL}/api/v1/waiters`;

  /* ---------- Tabulator ---------- */
  function createWaiterTable(elementId, group) {
    const old = Tabulator.findTable(`#${elementId}`)[0];
    if (old) old.destroy();

    apiFetch(`${WAITERS_URL}?belongingGroup=${group}`)
      .then(r => r.json())
      .then(data => {
        new Tabulator(`#${elementId}`, {
          data,
          layout: 'fitColumns',
          autoResize: true,
          placeholder: 'Nessun cameriere trovato',
          columns: [
            {
              title: 'Azioni',
              hozAlign: 'center',
              formatter(cell) {
                const { id } = cell.getRow().getData();
                return `
                  <button class="btn btn-sm btn-outline-secondary me-1 view-waiter-btn" data-id="${id}">
                    <i class="bi bi-search"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-primary me-1 edit-waiter-btn" data-id="${id}">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger delete-waiter-btn" data-id="${id}">
                    <i class="bi bi-trash3"></i>
                  </button>`;
              },
              cellClick(e) {
                const btn = e.target.closest('button');
                if (!btn) return;
                const { id } = btn.dataset;
                if (btn.classList.contains('edit-waiter-btn'))   openEditWaiterModal(id);
                if (btn.classList.contains('delete-waiter-btn')) deleteWaiter(id);
                if (btn.classList.contains('view-waiter-btn'))   openWaiterDetailModal(id);
              },
            },
            { title: 'Nome',     field: 'name' },
            { title: 'Cognome',  field: 'surname' },
            { title: 'Telefono', field: 'telephoneNumber' },
            { title: 'Email',    field: 'email' },
            { title: 'Ordine',   field: 'positionOrder' },
            { title: 'Ultimo',   field: 'latest', formatter: 'tickCross', hozAlign: 'center' },
          ],
        });
      })
      .catch(err => {
        console.error(err);
        document.getElementById(elementId).innerHTML =
          `<div class="alert alert-danger">Errore caricamento (${group})</div>`;
      });
  }

  createWaiterTable('table-male',      'MALE');
  createWaiterTable('table-female',    'FEMALE');
  createWaiterTable('table-secondary', 'SECONDARY');

  /* ---------- Aggiungi cameriere ---------- */
  document.getElementById('btn-add-waiter').onclick = () => {
    fetch('../modals/waiterModal.html')
      .then(r => r.text())
      .then(html => {
        document.getElementById('waiterModalContainer').innerHTML = html;
        import('../modals/waiterModal.js').then(mod => {
          mod.initWaiterModal();
          new bootstrap.Modal('#waiterModal').show();
        });
      });
  };

  /* ---------- Edit / Delete / Detail ---------- */
  function openEditWaiterModal(id) {
    apiFetch(`${WAITERS_URL}/${id}`)
      .then(r => r.json())
      .then(waiter =>
        fetch('../modals/waiterModal.html').then(r => r.text()).then(html => {
          document.getElementById('waiterModalContainer').innerHTML = html;
          import('../modals/waiterModal.js').then(mod => {
            mod.initWaiterModal();

            document.getElementById('waiterName').value        = waiter.name;
            document.getElementById('waiterSurname').value     = waiter.surname;
            document.getElementById('waiterPhone').value       = waiter.telephoneNumber || '';
            document.getElementById('waiterEmail').value       = waiter.email || '';
            document.getElementById('waiterPosition').value    = waiter.positionOrder;
            document.getElementById('waiterGroup').value       = waiter.belongingGroup;
            document.getElementById('waiterLatest').checked    = waiter.latest;
            document.getElementById('waiterUser').value        = waiter.username || '';
            document.getElementById('waiterAccessLevel').value = waiter.accessLevel || '';
            document.getElementById('waiterPass').value        = '';
            document.getElementById('waiterPass').disabled     = true;

            document.getElementById('waiterModalLabel').textContent = 'Modifica Cameriere';
            document.getElementById('waiterForm').dataset.editingId = id;
            document.querySelector('#waiterModal .modal-footer button[type="submit"]').textContent = 'Modifica';

            new bootstrap.Modal('#waiterModal').show();
          });
        }),
      )
      .catch(err => alert('Errore nel caricamento del cameriere: ' + err.message));
  }

  function deleteWaiter(id) {
    if (!confirm('Sei sicuro di voler eliminare questo cameriere?')) return;
    apiFetch(`${WAITERS_URL}/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          alert('Cameriere eliminato');
          initSquadra();
        } else {
          alert('Errore durante l\'eliminazione del cameriere');
        }
      });
  }

  function openWaiterDetailModal(id) {
    fetch('../modals/waiterDetailModal.html')
      .then(r => r.text())
      .then(html => {
        document.getElementById('waiterModalContainer').innerHTML = html;
        import('../modals/waiterDetailModal.js').then(mod => {
          mod.initWaiterDetailModal(id);
          new bootstrap.Modal('#waiterDetailModal').show();
        });
      });
  }
}
