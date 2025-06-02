(function initLogin() {
  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password || password.length < 6) {
      showError("Credenziali non valide.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/v1/auth/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        window.location.href = "../home/home.html";
      } else {
        showError("Credenziali non valide o errore del server.");
      }
    } catch (error) {
      console.error("Errore di rete:", error);
      showError("Errore di connessione al server.");
    }
  });

  function showError(message) {
    const errorElem = document.getElementById("error");
    errorElem.innerText = message;
    errorElem.style.display = "block";
  }
})();