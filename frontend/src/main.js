let socket;
const mode = import.meta.env.VITE_MODE;
const websocketURL = mode === 'dev'
  ? import.meta.env.VITE_DEV_WEBSOCKET_URL
  : import.meta.env.VITE_PI_WEBSOCKET_URL;

console.log("WebSocket URL is:", websocketURL);

let currentWord = "";
let currentLetterIndex = 0;

connectWebSocket();

function connectWebSocket() {
  socket = new WebSocket(`${websocketURL}/ws/frontend`);

  socket.onopen = () => console.log("Connected to WebSocket!");
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "show_letter") {
      displayBraille(data.pins);
    }
  };
  socket.onerror = (e) => console.error("WebSocket error:", e);
}

function displayBraille(pins) {
  const container = document.getElementById("braille-display");
  container.innerHTML = "";
  pins.forEach(pin => {
    const dot = document.createElement("div");

    dot.className = `
      w-16 h-16
      rounded-full
      m-2
      ${pin === 1 ? 'bg-black' : 'bg-white border'}
    `;

    container.appendChild(dot);
  });
}

document.getElementById("startBtn").addEventListener("click", async () => {
  currentWord = document.getElementById("wordInput").value.trim();
  if (!currentWord) return alert("Please enter a word.");

  currentLetterIndex = 0;
  await fetch(`${websocketURL.replace('ws', 'http')}/api/setword`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: currentWord })
  });

  document.getElementById("output").textContent = `Word: ${currentWord}`;
  document.getElementById("nextBtn").classList.remove("hidden");
});

document.addEventListener("keydown", (e) => {
  const perkinsKeys = ['s', 'd', 'f', 'j', 'k', 'l'];
  if (perkinsKeys.includes(e.key.toLowerCase())) {
    // Capture perkins key input (for simplicity, storing as binary [s,d,f,j,k,l])
    const values = perkinsKeys.map(k => (k === e.key.toLowerCase() ? 1 : 0));
    socket.send(JSON.stringify({ event: "perkins_input", values }));
    console.log("Sent Perkins input:", values);
  }

  if (e.key === "Enter") {
    socket.send(JSON.stringify({ event: "next_letter" }));
    console.log("Requested next letter");
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  socket.send(JSON.stringify({ event: "next_letter" }));
});