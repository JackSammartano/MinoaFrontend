export const BASE_URL = 'http://localhost:8080';

/**
 * Wrapper attorno a fetch() che:
 * - aggiunge automaticamente l'header Authorization: Bearer <token>
 * - intercetta le risposte 401 (token scaduto / non valido):
 *   pulisce il localStorage e reindirizza al login senza propagare errori
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '../login/login.html';
    return new Promise(() => {});
  }

  if (response.status === 403) {
    alert('Non hai i permessi per eseguire questa operazione.');
    return new Promise(() => {});
  }

  return response;
}

/**
 * Disabilita un pulsante e mostra uno spinner mentre asyncFn è in esecuzione.
 * Ripristina lo stato originale al termine, sia in caso di successo che di errore.
 *
 * @param {HTMLButtonElement} button  - Il pulsante da disabilitare
 * @param {Function}          asyncFn - Funzione asincrona da eseguire
 */
export async function withLoading(button, asyncFn) {
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML =
    `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>` +
    originalHtml;
  try {
    await asyncFn();
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

export function populateWaiterSelect(selectId, belongingGroup) {
  return apiFetch(`${BASE_URL}/api/v1/waiters?belongingGroup=${belongingGroup}`)
    .then(res => res.json())
    .then(waiters => {
      const select = document.getElementById(selectId);
      select.innerHTML = waiters
        .map(w => `<option value="${w.id}" ${w.latest ? 'selected' : ''}>${w.name} ${w.surname}</option>`)
        .join('');
    });
}
