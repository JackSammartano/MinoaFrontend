import { apiFetch, BASE_URL, withLoading } from '../utils/utils.js';

/**
 * Apre il modale di sostituzione cameriere.
 *
 * @param {number} eventId       - ID dell'evento
 * @param {number} givingId      - ID del cameriere da sostituire
 * @param {string} givingLabel   - Nome + Cognome del cameriere da sostituire (per la UI)
 * @param {Function} onSuccess   - Callback chiamata dopo sostituzione avvenuta con successo
 */
export async function openSwapWaiterModal(eventId, givingId, givingLabel, onSuccess) {
  /* ── inietta HTML se non già presente ── */
  if (!document.getElementById('swapWaiterModal')) {
    const html = await fetch('../modals/swapWaiterModal.html').then(r => r.text());
    document.body.insertAdjacentHTML('beforeend', html);
  }

  const modalEl  = document.getElementById('swapWaiterModal');
  const modal    = new bootstrap.Modal(modalEl);
  const errorBox = modalEl.querySelector('#swapError');

  /* ── reset UI ── */
  document.getElementById('swapGivingName').textContent = givingLabel;
  errorBox.classList.add('d-none');
  errorBox.textContent = '';

  /* ── popolo il dropdown: disponibili, ordinati per debito cambio ── */
  const select = document.getElementById('swapReceivingSelect');
  select.innerHTML = '<option value="">-- seleziona cameriere --</option>';

  const [assignedWaiters, swapDebts] = await Promise.all([
    apiFetch(`${BASE_URL}/api/v1/events/${eventId}/waiters`).then(r => r.json()),
    apiFetch(`${BASE_URL}/api/v1/waiters/${givingId}/swap-debts`).then(r => r.json()),
  ]);

  const assignedIds = new Set(assignedWaiters.map(w => w.id));

  const available    = swapDebts.filter(w => !assignedIds.has(w.waiterId));
  const inDebt       = available.filter(w => w.debt > 0);
  const others       = available.filter(w => w.debt <= 0);

  if (inDebt.length > 0) {
    const grpDebt = document.createElement('optgroup');
    grpDebt.label = 'In debito di cambio';
    select.appendChild(grpDebt);
    inDebt.forEach(w => { grpDebt.appendChild(createOpt(w, true)); });
  }

  const grpOthers = document.createElement('optgroup');
  grpOthers.label = inDebt.length > 0 ? 'Altri disponibili' : 'Disponibili';
  select.appendChild(grpOthers);
  others.forEach(w => { grpOthers.appendChild(createOpt(w, false)); });

  function createOpt(w, showDebt) {
    const opt = document.createElement('option');
    opt.value = w.waiterId;
    const debtLabel = showDebt && w.debt > 0
      ? ` — deve ${w.debt} cambio${w.debt > 1 ? 'i' : ''}`
      : '';
    opt.textContent = `${w.name} ${w.surname} (${w.belongingGroup})${debtLabel}`;
    return opt;
  }

  modal.show();

  /* ── conferma sostituzione ── */
  const confirmBtn = document.getElementById('btnConfirmSwap');

  // rimuovo listener precedenti per evitare duplicati
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newBtn);

  newBtn.addEventListener('click', () => {
    const receivingId = parseInt(select.value);
    if (!receivingId) {
      errorBox.textContent = 'Selezionare un cameriere sostituto.';
      errorBox.classList.remove('d-none');
      return;
    }

    errorBox.classList.add('d-none');

    withLoading(newBtn, () =>
      apiFetch(`${BASE_URL}/api/v1/events/${eventId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ givingWaiterId: givingId, receivingWaiterId: receivingId }),
      })
      .then(r => {
        if (!r.ok) return r.json().then(err => { throw new Error(err.message || 'Errore durante la sostituzione.'); });
        return r.json();
      })
      .then(data => {
        modal.hide();
        if (typeof onSuccess === 'function') onSuccess(data.message);
      })
      .catch(err => {
        errorBox.textContent = err.message;
        errorBox.classList.remove('d-none');
      })
    );
  });
}
