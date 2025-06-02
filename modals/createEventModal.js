// Funzione centralizzata per il reset completo del form
function resetEventForm() {
  const form = document.getElementById("createEventForm");
  form.reset();
  delete form.dataset.editingId;

  document.getElementById("eventType").disabled = false;
  document.getElementById("diners").disabled = false;
  document.getElementById("createEventModalLabel").innerText = "Crea Nuovo Evento";
  document.querySelector("#createEventForm button[type='submit']").innerText = "Crea";
}

// Gestione del submit (creazione o modifica evento)
document.getElementById("createEventForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const editingId = this.dataset.editingId;
  const method = editingId ? "PUT" : "POST";
  const url = editingId
    ? `http://localhost:8080/api/v1/events/${editingId}`
    : "http://localhost:8080/api/v1/events";

  const body = {
    name: document.getElementById("eventName").value,
    date: document.getElementById("eventDate").value,
    eventstype: document.getElementById("eventType").value,
    diners: parseInt(document.getElementById("diners").value),
    mealType: document.getElementById("mealType").value,
    eventLocation: document.getElementById("eventLocation").value
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
      if (!res.ok) throw new Error("Errore durante la " + (editingId ? "modifica" : "creazione") + " dell'evento");
      return res.json();
    })
    .then(() => {
      alert("Evento " + (editingId ? "modificato" : "creato") + " con successo");

      // Chiudi modale
      const modalEl = document.getElementById("createEventModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Reset completo del form
      resetEventForm();

      // Ricarica eventi
      if (typeof loadEventi === "function") loadEventi();
    })
    .catch(err => {
      alert(err.message);
    });
});

// Annulla (bottone): reset form
document.getElementById("cancelCreateEvent").addEventListener("click", resetEventForm);

// Chiusura modale (X o clic esterno): reset form
document.getElementById("createEventModal").addEventListener("hidden.bs.modal", resetEventForm);
