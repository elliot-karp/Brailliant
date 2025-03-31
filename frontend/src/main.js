let socket;
let websocketURL;
const mode = "local";
if(mode === "local"){
    websocketURL = 'ws://10.0.0.63:5000'
}
console.log("WebSocket URL is:", websocketURL);

// This will hold the state received from the backend.
let currentState = {};

// Cache DOM elements
const inputField = document.getElementById("wordInput");
const typedWordDisplay = document.getElementById("typedWordDisplay");
const promptTextEl = document.getElementById("promptText");
const outputDiv = document.getElementById("output");
const brailleDisplay = document.getElementById("braille-display");

// Focus the input field on load
inputField.focus();

/**
 * Returns a random word from a predefined list.
 */
function getRandomWord() {
  const words = [
    "apple", "bread", "chair", "dance", "earth", "flame", "grape", "horse", "input", "juice",
    "knife", "lemon", "magic", "night", "ocean", "plant", "quiet", "river", "stone", "table",
    "under", "voice", "water", "youth", "zebra", "brick", "cloud", "drink", "eagle", "fresh",
    "grass", "happy", "ivory", "jelly", "knock", "light", "money", "north", "opine", "paint",
    "quick", "round", "shelf", "train", "union", "valid", "watch", "xenon", "yield", "zebra"
  ];
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Renders the UI based solely on the state from the server.
 * In braille mode, only the current letter is shown along with a nicely formatted Braille cell.
 */
function renderState(state) {
  if (state.mode === "set_word") {
    promptTextEl.classList.remove("hidden");
    promptTextEl.textContent = "Type a word and press Enter to set it";
    promptTextEl.classList.add("animate-pulse");
    promptTextEl.classList.remove("font-bold");
  
    inputField.style.display = "block";
    typedWordDisplay.classList.remove("hidden");
    brailleDisplay.innerHTML = "";
  } else if (state.mode === "braille_mode") {
    console.log("we now in braille");
    const currentLetter = (state.current_letter_index > 0 && state.current_word)
      ? state.current_word[state.current_letter_index - 1]
      : "";
    if (currentLetter === "") {
      promptTextEl.classList.add("animate-pulse");
      promptTextEl.classList.remove("font-bold");
      promptTextEl.textContent = "Press Enter to start";
    } else {
      promptTextEl.textContent = currentLetter;
      promptTextEl.classList.remove("animate-pulse");
      promptTextEl.classList.add("font-bold");
    }
    inputField.style.display = "none";
    typedWordDisplay.textContent = state.current_word;
    typedWordDisplay.classList.remove("hidden");
  
    renderBrailleDisplay(state.pins);
  }
}

function renderBrailleDisplay(pins) {
  brailleDisplay.innerHTML = "";
  if (!pins || pins.length !== 6) return;
  const brailleCell = document.createElement("div");
  brailleCell.className = `
    grid grid-cols-2 gap-6
    place-items-center
  `;
  pins.forEach(pin => {
    const dot = document.createElement("div");
    dot.className = `
      w-20 h-20 rounded-full
      ${pin === 1 ? "bg-black" : "bg-gray-300"}
    `;
    brailleCell.appendChild(dot);
  });
  brailleDisplay.appendChild(brailleCell);
}

/**
 * Applies a new state received from the server and updates the UI.
 */
function applyState(newState) {
  currentState = newState;
  renderState(currentState);
}

// Establish the main WebSocket connection for frontend events.
function connectWebSocket() {
  socket = new WebSocket(`${websocketURL}/ws/frontend`);
  socket.onopen = () => console.log("Connected to Frontend WebSocket!");
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "state_update") {
      console.log("Received state update:", data.state);
      applyState(data.state);
    }
  };
  socket.onerror = (e) => console.error("WebSocket error:", e);
}
connectWebSocket();

/**
 * Submits a word to the backend when in set_word mode.
 * If no word is typed, a random word is chosen.
 */
async function submitWord() {
  let trimmed = inputField.value.trim();
  if (trimmed === "") {
    trimmed = getRandomWord();
    console.log("No word typed – using random word:", trimmed);
  }
  await fetch(`${websocketURL.replace("ws", "http")}/api/setword`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: trimmed })
  });
 
  socket.send(JSON.stringify({ action: "next_letter" }));
}

// Listen for input events to update the typed word display.
inputField.addEventListener("input", () => {
  const value = inputField.value;
  typedWordDisplay.textContent = value;
  if (value.length > 0) {
    promptTextEl.textContent = "Press Enter to start";
  } else {
    promptTextEl.textContent = "Type a word and press Enter to set it";
  }
});

// Listen for Enter in the input field when in "set_word" mode.
inputField.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (currentState.mode === "set_word") {
      await submitWord();
    }
  }
});

// Global variable to accumulate Perkins input.
let perkinsInput = [0, 0, 0, 0, 0, 0];

document.addEventListener("keydown", (e) => {
  if (currentState.mode === "braille_mode") {
    const perkinsKeys = ["s", "d", "f", "j", "k", "l"];
    const keyLower = e.key.toLowerCase();

    if (perkinsKeys.includes(keyLower)) {
      const index = perkinsKeys.indexOf(keyLower);
      perkinsInput[index] = 1;
      console.log("Accumulated Perkins input:", perkinsInput);
      e.preventDefault();
    }
    // When Enter is pressed in braille_mode, send the accumulated Perkins input via the API.
    else if (e.key === "Enter") {
      const hasInput = perkinsInput.some(val => val === 1);
      if (hasInput) {
        fetch(`${websocketURL.replace("ws", "http")}/api/perkins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: perkinsInput })
        })
        .then(response => response.json())
        .then(data => console.log("Sent Perkins input via API:", perkinsInput, data))
        .catch(err => console.error("Error sending Perkins input:", err));
        perkinsInput = [0, 0, 0, 0, 0, 0];
      }
      e.preventDefault();
    }
    // Use the right arrow key to trigger the next letter on the main socket.
    else if (e.key === "ArrowRight") {
      socket.send(JSON.stringify({ action: "next_letter" }));
      console.log("Sent next_letter action via ArrowRight");
      e.preventDefault();
    }
  }
});

// Global keydown listener for set_word mode to auto-focus and simulate keystrokes.
document.addEventListener("keydown", (e) => {
  if (currentState.mode === "set_word" && document.activeElement !== inputField) {
    inputField.focus();
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      inputField.value += e.key;
      const inputEvent = new Event("input", { bubbles: true });
      inputField.dispatchEvent(inputEvent);
      e.preventDefault();
    } else if (e.key === "Backspace") {
      inputField.value = inputField.value.slice(0, -1);
      const inputEvent = new Event("input", { bubbles: true });
      inputField.dispatchEvent(inputEvent);
      e.preventDefault();
    }
  }
});

// Listen for the backslash key to trigger a state reset.
document.addEventListener("keydown", async (e) => {
  if (e.key === "\\") {
    e.preventDefault();
    console.log("Reset key pressed, triggering state reset");
    inputField.value = "";
    typedWordDisplay.textContent = "";
    await fetch(`${websocketURL.replace("ws", "http")}/api/reset`, { method: "GET" });
    inputField.focus();
  }
});
