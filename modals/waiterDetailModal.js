export function initWaiterDetailModal(waiterId) {
  const token = localStorage.getItem("token");

  fetch(`http://localhost:8080/api/v1/events/by-waiter/${waiterId}`, {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => res.json())
    .then(data => {
      const table = new Tabulator("#waiterEventsTable", {
        data,
        layout: "fitColumns",
        placeholder: "Nessun evento trovato",
        initialSort: [{ column: "date", dir: "desc" }],
        columns: [
          { title: "Nome Evento", field: "name" },
          { title: "Data", field: "date", formatter: dateFormatter },
          { title: "Tipo", field: "eventstype" },
          { title: "Coperti", field: "diners" },
          { title: "Tipo Pasto", field: "mealType" },
          { title: "Location", field: "eventLocation" }
        ]
      });

      // 🔍 Filtro per mese
      const monthSelect = document.getElementById("filterMonth");
      monthSelect.addEventListener("change", () => {
        const selectedMonth = monthSelect.value;

        if (selectedMonth) {
          table.setFilter(data => {
            const date = new Date(data.date);
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            return month === selectedMonth;
          });
        } else {
          table.clearFilter();
        }
      });
    })
    .catch(err => {
      console.error("Errore nel caricamento eventi:", err);
      document.getElementById("waiterEventsTable").innerHTML = `
        <div class="alert alert-danger">Errore nel caricamento eventi.</div>`;
    });

  function dateFormatter(cell) {
    const d = new Date(cell.getValue());
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  }
}
