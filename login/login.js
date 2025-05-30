document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:8080/api/v1/auth/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      window.location.href = "../home/home.html";
    } else {
      document.getElementById("error").innerText = "Credenziali non valide.";
    }
  } catch (error) {
    document.getElementById("error").innerText = "Errore di connessione al server.";
  }
});
