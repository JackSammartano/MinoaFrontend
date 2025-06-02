// modals/modificaUltimoModal.js
import { populateWaiterSelect } from "../utils/utils.js";

export function initModificaUltimoModal() {
  const modalEl = document.getElementById("modificaUltimoModal");
  if (!modalEl) return;

  const token = localStorage.getItem("token");
  const triggerButton = document.getElementById("btn-modifica-ultimi"); // <== questo è il bottone da rifocalizzare


  const groupSelectIds = {
    MALE: "select-male",
    FEMALE: "select-female",
    SECONDARY: "select-secondary"
  };

  const modal = new bootstrap.Modal(modalEl);

  // Aspetta che la modale sia completamente visibile
  modalEl.addEventListener("shown.bs.modal", () => {
    // A questo punto è sicuro popolare e mettere il focus
    Object.entries(groupSelectIds).forEach(([group, id]) => {
      populateWaiterSelect(id, group, token);
    });

    // Listener dei bottoni
    document.getElementById("btn-aggiorna-modale").addEventListener("click", () => {
      const selectedWaiters = Object.values(groupSelectIds).map(id => {
        const select = document.getElementById(id);
        return { id: parseInt(select.value) };
      });

      fetch("http://localhost:8080/api/v1/waiters", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(selectedWaiters)
      }).then(res => {
        if (res.ok) {
          bootstrap.Modal.getInstance(modalEl).hide();
          if (typeof loadSquadra === "function") {
          loadSquadra();
          }
        } else {
          alert("Errore durante l'aggiornamento.");
        }
      });
    });

    document.getElementById("btn-annulla-modale").addEventListener("click", () => {
      document.getElementById("modificaUltimoForm").reset();
      triggerButton.focus();
    });
  });



  modal.show(); // mostra la modale
}

