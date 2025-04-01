from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from braille_box import braille_pins, get_random_word
import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Global shared state
state = {
    "mode": "set_word",            # "set_word", "braille_mode", "perkins_mode", or "completed"
    "current_word": "",
    "current_letter_index": 0,     # 0-indexed; valid letters are indices 0..(len(word)-1)
    "pins": [],                    # Braille pins for the current letter
    "perkins_input": [0, 0, 0, 0, 0, 0],  # Latest user attempt
    "completed": False             # True when all letters processed
}

# Store connected WebSocket clients for broadcasting
frontend_clients = set()

async def broadcast_state():
    data = {"event": "state_update", "state": state}
    disconnected = []
    for client in frontend_clients:
        try:
            await client.send_json(data)
        except Exception:
            disconnected.append(client)
    for client in disconnected:
        frontend_clients.remove(client)

# Models
class SetWord(BaseModel):
    word: str

class PerkinsInput(BaseModel):
    values: list[int]

@app.post("/api/setword")
async def set_word(data: SetWord):
    """Sets a word for braille practice and loads the first letter's pins."""
    state["current_word"] = data.word.lower()
    state["current_letter_index"] = 0
    state["completed"] = False
    state["perkins_input"] = [0, 0, 0, 0, 0, 0]
    state["mode"] = "braille_mode"

    if state["current_word"]:
        # Show the braille pins for the first letter (index 0).
        state["pins"] = braille_pins(state["current_word"][0])
    else:
        # If no word was set, just remain in braille mode but pins are empty.
        state["pins"] = []

    print("Word set to:", state["current_word"], flush=True)
    await broadcast_state()
    return {"status": "word set", "word": state["current_word"]}

@app.get("/api/getword")
async def get_word():
    """Gets a random word from braille_box, sets it, and loads first letter's pins."""
    word = get_random_word()
    state["current_word"] = word.lower()
    state["current_letter_index"] = 0
    state["completed"] = False
    state["perkins_input"] = [0, 0, 0, 0, 0, 0]
    state["mode"] = "braille_mode"

    if state["current_word"]:
        state["pins"] = braille_pins(state["current_word"][0])
    else:
        state["pins"] = []

    print("Random word set to:", state["current_word"], flush=True)
    await broadcast_state()
    return {"word": state["current_word"]}

@app.post("/api/perkins")
async def perkins_input(data: PerkinsInput):
    """
    Receives the user's Perkins input (six-element list).
    If it matches the current letter's pins, advance to the next letter 
    (or set the word to 'completed' if it was the last letter).
    """
    print("Received Perkins input:", data.values, flush=True)
    state["perkins_input"] = data.values
    state["mode"] = "perkins_mode"

    # Compare user input to expected pins
    if data.values == state["pins"]:
        print("Correct Perkins input received.", flush=True)
        # Reset after a correct entry
        state["perkins_input"] = [0, 0, 0, 0, 0, 0]

        # If on the last letter already, mark as completed
        if state["current_letter_index"] == len(state["current_word"]) - 1:
            # Move index one beyond to indicate done
            state["current_letter_index"] = len(state["current_word"])
            state["mode"] = "completed"
            state["completed"] = True
            print("Word complete.", flush=True)
        else:
            # Otherwise, go to the next letter
            state["current_letter_index"] += 1
            letter = state["current_word"][state["current_letter_index"]]
            state["pins"] = braille_pins(letter)
            state["mode"] = "braille_mode"
            print("Advancing to next letter:", letter, flush=True)
    else:
        print("Incorrect Perkins input.", flush=True)

    await broadcast_state()
    return {"status": "perkins input processed"}

@app.get("/api/reset")
async def reset_state():
    """Resets everything to the initial state."""
    state["mode"] = "set_word"
    state["current_word"] = ""
    state["current_letter_index"] = 0
    state["pins"] = []
    state["perkins_input"] = [0, 0, 0, 0, 0, 0]
    state["completed"] = False
    print("State has been reset.", flush=True)
    await broadcast_state()
    return {"status": "state reset"}

@app.websocket("/ws/frontend")
async def frontend_ws(websocket: WebSocket):
    """
    WebSocket endpoint for the frontend.
    Clients can send JSON with { action: "..." } 
    e.g. { action: "next_letter" }.
    """
    await websocket.accept()
    frontend_clients.add(websocket)
    # Send initial state
    await websocket.send_json({"event": "state_update", "state": state})

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action", "")

            if action == "next_letter":
                # Let the user manually skip to the next letter if not completed
                if state["mode"] in ("braille_mode", "perkins_mode"):
                    # If we were on the last letter, finalize
                    if state["current_letter_index"] == len(state["current_word"]) - 1:
                        state["current_letter_index"] = len(state["current_word"])
                        state["mode"] = "completed"
                        state["completed"] = True
                        print("Manual next_letter: Word complete.", flush=True)
                    else:
                        state["current_letter_index"] += 1
                        if state["current_letter_index"] < len(state["current_word"]):
                            letter = state["current_word"][state["current_letter_index"]]
                            state["pins"] = braille_pins(letter)
                            state["perkins_input"] = [0, 0, 0, 0, 0, 0]
                            state["mode"] = "braille_mode"
                            print("Manual next_letter: advancing to", letter, flush=True)

                    await broadcast_state()
                else:
                    print("Ignoring next_letter; current mode:", state["mode"], flush=True)

            else:
                print("Unknown action from frontend:", action, flush=True)

    except WebSocketDisconnect:
        frontend_clients.remove(websocket)
