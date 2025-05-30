const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

const username = localStorage.getItem("username") || "U";
document.getElementById("userIcon").innerText = username.charAt(0).toUpperCase();

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "../login/login.html";
}

function loadDashboard() {
  document.getElementById("mainContent").innerHTML = `
    <h2>Dashboard</h2>
    <p>Benvenuto nella dashboard!</p>
  `;
  setActiveLink("Dashboard");
}

function loadSquadra() {
  document.getElementById("mainContent").innerHTML = `
    <h2>Squadra</h2>
    <p>Questa sezione conterrà l'elenco dei camerieri.</p>
  `;
  setActiveLink("Squadra");
}

function setActiveLink(section) {
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.innerText === section) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}
