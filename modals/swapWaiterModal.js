import { apiFetch, BASE_URL } from '../utils/utils.js';

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

  /* ── popolo il dropdown con tutti i camerieri (escluso il cedente) ── */
  const select = document.getElementById('swapReceivingSelect');
  select.innerHTML = '<option value="">-- seleziona cameriere --</option>';

  const groups = ['MALE', 'FEMALE', 'SECONDARY'];
  const allWaiters = (await Promise.all(
    groups.map(g =>
      apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=${g}`)
        .then(r => r.json())
    )
  )).flat();

  allWaiters
    .filter(w => w.id !== givingId)
    .forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} ${w.surname} (${w.belongingGroup})`;
      select.appendChild(opt);
    });

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

    newBtn.disabled = true;
    errorBox.classList.add('d-none');

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
      newBtn.disabled = false;
    });
  });
}
