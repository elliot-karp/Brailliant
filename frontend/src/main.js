import "./style.css";

let word = "";
let currentIndex = 0;

async function showBraille(letter) {
  const res = await fetch("http://localhost:5000/api/braille", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(letter),
  });

  const data = await res.json();
  const pins = data.result; // [1, 0, 0, 1, 0, 0] etc.

  const container = document.getElementById("braille-display");
  container.innerHTML = "";

  pins.forEach((pin) => {
    const dot = document.createElement("div");
    dot.textContent = pin === 1 ? "●" : "○";
    dot.className = "w-10 h-10 flex items-center justify-center border rounded-full";
    container.appendChild(dot);
  });
}

document.getElementById("start").addEventListener("click", async () => {
  const res = await fetch("http://localhost:5000/api/word");
  const data = await res.json();
  word = data.word.toLowerCase();
  currentIndex = 0;

  document.getElementById("output").textContent = `Feel the word: ${word}`;
  await showBraille(word[currentIndex]);
  document.getElementById("next").classList.remove("hidden");
});

document.getElementById("next").addEventListener("click", async () => {
  currentIndex++;
  if (currentIndex < word.length) {
    await showBraille(word[currentIndex]);
  } else {
    document.getElementById("braille-display").innerHTML = "";
    document.getElementById("next").classList.add("hidden");
    document.getElementById("output").textContent = "You've finished the word!";
  }
});