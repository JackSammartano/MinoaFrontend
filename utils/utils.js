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
    // Restituisce una Promise che non si risolve mai:
    // il redirect sopra prende il controllo, nessun .then() successivo viene eseguito
    return new Promise(() => {});
  }

  return response;
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
