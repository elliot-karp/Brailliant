let socket;
const mode = import.meta.env.VITE_MODE;
const websocketURL =
  mode === "dev"
    ? import.meta.env.VITE_DEV_WEBSOCKET_URL
    : import.meta.env.VITE_PI_WEBSOCKET_URL;

console.log("WebSocket URL is:", websocketURL);

// Define modes for handling the Enter key
const SET_WORD_MODE = "set_word";
const BRAILLE_MODE = "braille_mode"
// Set the initial mode (you can change this later if needed)
let currentMode = SET_WORD_MODE;

let currentWord = "";
let currentLetterIndex = 0;

const inputField = document.getElementById("wordInput");
const typedWordDisplay = document.getElementById("typedWordDisplay");
const promptTextEl = document.getElementById("promptText");

inputField.focus();





// Update display: as the user types, hide the flashing prompt and show their input at the top.
inputField.addEventListener("input", () => {
  const value = inputField.value;
  if (value.length > 0) {
    //promptTextEl.classList.add("hidden");
    
    promptTextEl.textContent = 'Press Enter to submit your word'

    typedWordDisplay.textContent = value;
    typedWordDisplay.classList.remove("hidden");
  } else {
    promptTextEl.classList.remove("hidden");
    typedWordDisplay.classList.add("hidden");
  }
});

// Function that handles starting logic based on mode and input content.
async function handleStart() {
  let trimmed = inputField.value.trim();
  if (currentMode === SET_WORD_MODE) {
    if (trimmed.length > 0) {
      // User typed a word: send it to the setword API.
      currentWord = trimmed;
      currentLetterIndex = 0;
      await fetch(`${websocketURL.replace("ws", "http")}/api/setword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: currentWord })
      });
      promptTextEl.classList.add("hidden");

      document.getElementById("output").textContent = `Word: ${currentWord}`;
      document.getElementById("nextBtn").classList.remove("hidden");
      currentMode = BRAILLE_MODE;
    } else {
      // No input provided: call the getword API to fetch a word.
      const response = await fetch(
        `${websocketURL.replace("ws", "http")}/api/getword`
      );


      const data = await response.json();

      promptTextEl.classList.add("hidden");

      typedWordDisplay.textContent  = data.word;

      console.log(data)
      typedWordDisplay.classList.remove("hidden");

      currentWord = data.word;
      currentLetterIndex = 0;

      await fetch(`${websocketURL.replace("ws", "http")}/api/setword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: currentWord })
      });

      document.getElementById("output").textContent = `Word: ${currentWord}`;
      document.getElementById("nextBtn").classList.remove("hidden");
      currentMode = BRAILLE_MODE;
    }
  }
}

// When the user presses Enter in the input field, handle start based on the mode.
inputField.addEventListener("keydown", async (e) => {
  inputField.focus();
  if (e.key === "Enter") {
    e.preventDefault();
    await handleStart();
  }
});


// Bind the start button to the same functionality.
// document.getElementById("startBtn").addEventListener("click", handleStart);

// Global keydown listener to capture Perkins-style input and request next letter.

function perkins_input(e) {
  if(currentMode === BRAILLE_MODE){
    const perkinsKeys = ["s", "d", "f", "j", "k", "l"];
    if (perkinsKeys.includes(e.key.toLowerCase())) {
      const values = perkinsKeys.map((k) =>
        k === e.key.toLowerCase() ? 1 : 0
      );
      socket.send(JSON.stringify({ event: "perkins_input", values }));
      console.log("Sent Perkins input:", values);
    }

    // if (e.key === "Enter") {
    //   socket.send(JSON.stringify({ event: "next_letter" }));
    //   console.log("Requested next letter");
    // }
  }
}

// Attach it to global keydown listener
document.addEventListener("keydown", perkins_input);


// Connect to the WebSocket server and handle incoming events.
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

// // Render Braille dots based on the provided pin configuration.
// function displayBraille(pins) {
//   const container = document.getElementById("braille-display");
//   container.innerHTML = "";
//   pins.forEach((pin) => {
//     const dot = document.createElement("div");
//     dot.className = `w-16 h-16 rounded-full m-2 ${
//       pin === 1 ? "bg-black" : "bg-white border"
//     }`;
//     container.appendChild(dot);
//   });
// }

connectWebSocket();
