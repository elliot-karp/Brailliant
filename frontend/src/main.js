// frontend.js

let socket;
let websocketURL;
const mode = "local";
if (mode === "local") {
  websocketURL = "ws://35.2.148.11:5000";  // Adjust if needed
}
console.log("WebSocket URL is:", websocketURL);

// State
let currentState = {};
/*
  Per the final layout:
    # {0}{1}
    # {2}{3}
    # {4}{5}
  We'll map:
    f -> index=0 (top-left)
    j -> index=1 (top-right)
    d -> index=2 (middle-left)
    k -> index=3 (middle-right)
    s -> index=4 (bottom-left)
    l -> index=5 (bottom-right)
*/
let perkinsInput = [0, 0, 0, 0, 0, 0];
let lastPerkinsInput = [0, 0, 0, 0, 0, 0];

// DOM Elements
const inputField = document.getElementById("wordInput");
const typedWordDisplay = document.getElementById("typedWordDisplay");
const promptTextEl = document.getElementById("promptText");
const brailleDisplay = document.getElementById("braille-display");

// Focus the input on load
inputField.focus();

/**
 * Renders the UI based on the server state.
 */
function renderState(state) {
  // If we're done, you might want to show a "Completed!" message, or handle it differently
  if (state.mode === "completed" || state.completed) {
    promptTextEl.textContent = "Word complete!";
    brailleDisplay.innerHTML = "";
    typedWordDisplay.textContent = state.current_word;
    return;
  }

  if (state.mode === "set_word") {
    promptTextEl.classList.remove("hidden");
    promptTextEl.textContent = "Type a word and press Enter to set it";
    promptTextEl.classList.add("animate-pulse");
    promptTextEl.classList.remove("font-bold");

    inputField.style.display = "block";
    typedWordDisplay.classList.remove("hidden");
    brailleDisplay.innerHTML = "";
  }
  else if (state.mode === "braille_mode" || state.mode === "perkins_mode") {
    // The "current" letter is the one at state.current_letter_index
    let currentLetter = "";
    if (
      state.current_letter_index >= 0 &&
      state.current_letter_index < state.current_word.length
    ) {
      currentLetter = state.current_word[state.current_letter_index];
    }

    if (!currentLetter) {
      // Probably means empty word or out-of-range index
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

    // If in perkins_mode, show a red overlay with the current (live) perkinsInput
    if (state.mode === "perkins_mode") {
      renderBrailleWithOverlay(state.pins, perkinsInput);
    } else {
      renderBrailleDisplay(state.pins);
    }
  }
}

/**
 * Renders a standard 6-dot Braille cell, left to right, top to bottom:
 *   # {0}{1}
 *   # {2}{3}
 *   # {4}{5}
 */
function renderBrailleDisplay(pins) {
  brailleDisplay.innerHTML = "";
  if (!pins || pins.length !== 6) return;

  // The display order for the user is [0,1,2,3,4,5]
  const displayOrder = [0, 1, 2, 3, 4, 5];
  const brailleCell = document.createElement("div");
  brailleCell.className = "grid grid-cols-2 gap-6 place-items-center";

  displayOrder.forEach(idx => {
    const dot = document.createElement("div");
    dot.className = `
      w-20 h-20 rounded-full
      ${pins[idx] === 1 ? "bg-black" : "bg-gray-300"}
    `;
    brailleCell.appendChild(dot);
  });

  brailleDisplay.appendChild(brailleCell);
}

/**
 * Renders Braille with a red overlay for the user's Perkins input.
 */
function renderBrailleWithOverlay(expectedPins, userPins) {
  brailleDisplay.innerHTML = "";
  if (!expectedPins || expectedPins.length !== 6) return;

  const displayOrder = [0, 1, 2, 3, 4, 5];
  const brailleCell = document.createElement("div");
  brailleCell.className = "grid grid-cols-2 gap-6 place-items-center";

  displayOrder.forEach(idx => {
    const expected = (expectedPins[idx] === 1);
    const user = (userPins[idx] === 1);

    const dot = document.createElement("div");
    if (user && expected) {
      // Correct dot pressed
      dot.className = "w-20 h-20 rounded-full bg-black border-4 border-red-500";
    } else if (user && !expected) {
      // Wrong dot pressed
      dot.className = "w-20 h-20 rounded-full bg-red-500";
    } else if (!user && expected) {
      // A dot that should have been pressed
      dot.className = "w-20 h-20 rounded-full bg-black";
    } else {
      // Dot not pressed and not expected
      dot.className = "w-20 h-20 rounded-full bg-gray-300";
    }
    brailleCell.appendChild(dot);
  });

  brailleDisplay.appendChild(brailleCell);
}

/**
 * Applies a new state from the server and updates the UI.
 */
function applyState(newState) {
  currentState = newState;
  renderState(currentState);
}

/**
 * Connect WebSocket to the backend.
 */
function connectWebSocket() {
  socket = new WebSocket(`${websocketURL}/ws/frontend`);
  socket.onopen = () => console.log("Connected to Frontend WebSocket!");
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.event === "state_update") {
      console.log("Received state update:", data.state);
      applyState(data.state);
    }
  };
  socket.onerror = e => console.error("WebSocket error:", e);
}
connectWebSocket();

/**
 * Submit a new word to the backend (when in set_word mode).
 */
async function submitWord() {
  let typed = inputField.value.trim();
  if (!typed) {
    typed = getRandomWord();
    console.log("No word typed – using random word:", typed);
  }
  await fetch(`${websocketURL.replace("ws", "http")}/api/setword`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: typed })
  });
  // No auto "next_letter" call here — we let the user see the first letter right away
}

/**
 * If you want a random word from the frontend side (instead of calling /api/getword).
 */
function getRandomWord() {
  const words = [
    "apple","bread","chair","dance","earth","flame","grape","horse","input","juice",
    "knife","lemon","magic","night","ocean","plant","quiet","river","stone","table",
    "under","voice","water","youth","zebra","brick","cloud","drink","eagle","fresh",
    "grass","happy","ivory","jelly","knock","light","money","north","opine","paint",
    "quick","round","shelf","train","union","valid","watch","xenon","yield","zebra"
  ];
  return words[Math.floor(Math.random() * words.length)];
}

// Listen for text input in set_word mode
inputField.addEventListener("input", () => {
  const val = inputField.value;
  typedWordDisplay.textContent = val;
  promptTextEl.textContent = val
    ? "Press Enter to start"
    : "Type a word and press Enter to set it";
});

// Listen for Enter in set_word mode
inputField.addEventListener("keydown", async e => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (currentState.mode === "set_word") {
      await submitWord();
    }
  }
});

/**
 * Key mapping for Perkins:
 *   f -> index 0 (top-left)
 *   j -> index 1 (top-right)
 *   d -> index 2 (middle-left)
 *   k -> index 3 (middle-right)
 *   s -> index 4 (bottom-left)
 *   l -> index 5 (bottom-right)
 */
const perkinsKeyMap = {
  f: 0,
  j: 1,
  d: 2,
  k: 3,
  s: 4,
  l: 5
};

/**
 * Keydown events for Braille or Perkins modes:
 *  - Perkins keys => set pin to 1
 *  - Backspace => reset pins
 *  - Enter => send pins if any set
 *  - ArrowRight => manual next_letter
 */
document.addEventListener("keydown", e => {
  const keyLower = e.key.toLowerCase();
  if (currentState.mode === "braille_mode" || currentState.mode === "perkins_mode") {
    // If it's one of our 6 Perkins keys:
    if (perkinsKeyMap.hasOwnProperty(keyLower)) {
      const index = perkinsKeyMap[keyLower];
      perkinsInput[index] = 1;
      console.log("Accumulated Perkins input:", perkinsInput);
      // Show the overlay
      renderBrailleWithOverlay(currentState.pins, perkinsInput);
      e.preventDefault();
    }
    // If user pressed Backspace => reset
    else if (e.key === "Backspace") {
      perkinsInput = [0, 0, 0, 0, 0, 0];
      console.log("Perkins input reset via Backspace");
      renderBrailleWithOverlay(currentState.pins, perkinsInput);
      e.preventDefault();
    }
    // If user pressed Enter => send the input if any
    else if (e.key === "Enter") {
      const hasInput = perkinsInput.some(val => val === 1);
      if (hasInput) {
        lastPerkinsInput = [...perkinsInput];
        fetch(`${websocketURL.replace("ws", "http")}/api/perkins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: perkinsInput })
        })
          .then(r => r.json())
          .then(data => console.log("Sent Perkins input to /api/perkins:", perkinsInput, data))
          .catch(err => console.error("Error sending Perkins input:", err));
        // Reset
        perkinsInput = [0, 0, 0, 0, 0, 0];
        renderBrailleWithOverlay(currentState.pins, perkinsInput);
      }
      e.preventDefault();
    }
    // Right arrow => manual next_letter
    else if (e.key === "ArrowRight") {
      socket.send(JSON.stringify({ action: "next_letter" }));
      console.log("Sent next_letter action via ArrowRight");
      e.preventDefault();
    }
  }
});

/**
 * In set_word mode, if user types while not focused on the input, we funnel keystrokes to inputField.
 */
document.addEventListener("keydown", e => {
  if (currentState.mode === "set_word" && document.activeElement !== inputField) {
    inputField.focus();
    // If it's a normal character, add it to the input field
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      inputField.value += e.key;
      const ev = new Event("input", { bubbles: true });
      inputField.dispatchEvent(ev);
      e.preventDefault();
    } else if (e.key === "Backspace") {
      inputField.value = inputField.value.slice(0, -1);
      const ev = new Event("input", { bubbles: true });
      inputField.dispatchEvent(ev);
      e.preventDefault();
    }
  }
});

// Use backslash to reset the entire state
document.addEventListener("keydown", async e => {
  if (e.key === "\\") {
    e.preventDefault();
    console.log("Reset key pressed. Resetting state...");
    inputField.value = "";
    typedWordDisplay.textContent = "";
    await fetch(`${websocketURL.replace("ws", "http")}/api/reset`, { method: "GET" });
    inputField.focus();
  }
});
