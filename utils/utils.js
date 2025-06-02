export function populateWaiterSelect(selectId, belongingGroup, token) {
  return fetch(`http://localhost:8080/api/v1/waiters?belongingGroup=${belongingGroup}`, {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => res.json())
    .then(waiters => {
      const select = document.getElementById(selectId);
      select.innerHTML = waiters.map(w =>
        `<option value="${w.id}" ${w.latest ? "selected" : ""}>${w.name} ${w.surname}</option>`
      ).join("");
    });
}
