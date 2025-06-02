export function initWaiterModal() {
  const form = document.getElementById("waiterForm");
  const cancelBtn = document.getElementById("cancelWaiter");
  const modalEl = document.getElementById("waiterModal");

  if (!form || !cancelBtn || !modalEl) {
    console.error("Elementi della modale non trovati");
    return;
  }

  // Gestione submit form
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const editingId = this.dataset.editingId;
    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `http://localhost:8080/api/v1/waiters/${editingId}`
      : "http://localhost:8080/api/v1/waiters";

const body = {
  name: document.getElementById("waiterName").value,
  surname: document.getElementById("waiterSurname").value,
  telephoneNumber: document.getElementById("waiterPhone").value,
  email: document.getElementById("waiterEmail").value,
  positionOrder: parseInt(document.getElementById("waiterPosition").value),
  belongingGroup: document.getElementById("waiterGroup").value,
  latest: document.getElementById("waiterLatest").checked,
  username: document.getElementById("waiterUser").value,
  password: document.getElementById("waiterPass").value,
  accessLevel: document.getElementById("waiterAccessLevel").value,
  
};

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) throw new Error("Errore durante la " + (editingId ? "modifica" : "creazione") + " del cameriere");
        return res.json();
      })
      .then(() => {
        alert("Cameriere " + (editingId ? "modificato" : "creato") + " con successo");

        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        resetWaiterForm();

        // Ricarica pagina squadra (dovrebbe essere definita globalmente)
        if (typeof loadSquadra === "function") loadSquadra();
      })
      .catch(err => alert(err.message));
  });

  cancelBtn.addEventListener("click", resetWaiterForm);
  modalEl.addEventListener("hidden.bs.modal", resetWaiterForm);
}

function resetWaiterForm() {
  const form = document.getElementById("waiterForm");
  document.querySelector("#waiterModal .modal-footer button[type='submit']").innerText = "Aggiungi";
  if (!form) return;

  form.reset();
  delete form.dataset.editingId;

  document.getElementById("waiterModalLabel").innerText = "Aggiungi Cameriere";
  document.querySelector("#waiterForm button[type='submit']").innerText = "Aggiungi";

   // Riabilita campo password
  const passField = document.getElementById("waiterPassword");
  if(passField){
    passField.disabled = false;
  }
}
