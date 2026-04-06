// modals/modificaUltimoModal.js
import { apiFetch, populateWaiterSelect, BASE_URL } from "../utils/utils.js";

export function initModificaUltimoModal() {
  const modalEl = document.getElementById("modificaUltimoModal");
  if (!modalEl) return;

  const triggerButton = document.getElementById("btn-modifica-ultimi");


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
      populateWaiterSelect(id, group);
    });

    // Listener dei bottoni
    document.getElementById("btn-aggiorna-modale").addEventListener("click", () => {
      const selectedWaiters = Object.values(groupSelectIds).map(id => {
        const select = document.getElementById(id);
        return { id: parseInt(select.value) };
      });

      apiFetch(`${BASE_URL}/api/v1/waiters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

