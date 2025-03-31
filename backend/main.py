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

# Global shared state for all frontend clients
state = {
    "mode": "set_word",            # "set_word" or "braille_mode"
    "current_word": "",
    "current_letter_index": 0,
    "pins": []                     # Current braille pins for display
}

# Sets to store connected frontend clients
frontend_clients = set()

# Helper function to broadcast state updates to all frontends
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

# API model for setting a word
class SetWord(BaseModel):
    word: str

@app.post("/api/setword")
async def set_word(data: SetWord):
    state["current_word"] = data.word.lower()
    state["current_letter_index"] = 0
    state["mode"] = "braille_mode"
    print("Word set to:", state["current_word"], flush=True)
    await broadcast_state()
    return {"status": "word set", "word": state["current_word"]}

@app.get("/api/getword")
async def get_word():
    word = get_random_word()
    state["current_word"] = word.lower()
    state["current_letter_index"] = 0
    state["mode"] = "braille_mode"
    print("Random word set to:", state["current_word"], flush=True)
    await broadcast_state()
    return {"word": state["current_word"]}

# API model for button press input
class ButtonPress(BaseModel):
    pins: list[int]

# Endpoint to handle button press events (e.g. physical button inputs)
@app.post("/api/button-press")
async def button_press(data: ButtonPress):
    state["pins"] = data.pins
    # For example, increment the current_letter_index when a button is pressed:
    state["current_letter_index"] += 1
    print("Received button press with pins:", data.pins, flush=True)
    await broadcast_state()
    return {"status": "button press processed"}

# New API model for Perkins input
class PerkinsInput(BaseModel):
    values: list[int]

# API endpoint to handle Perkins input from the frontend or physical keyboard

# TODO actually use this api to display error delta to make this a learing device
@app.post("/api/perkins")
async def perkins_input(data: PerkinsInput):
    print("Received Perkins input via API:", data.values, flush=True)
    # Optionally, process the Perkins input here.
    return {"status": "perkins input received"}

# Reset state API endpoint
@app.get("/api/reset")
async def reset_state():
    state["mode"] = "set_word"
    state["current_word"] = ""
    state["current_letter_index"] = 0
    state["pins"] = []
    print("State has been reset", flush=True)
    await broadcast_state()
    return {"status": "state reset"}

# WebSocket endpoint for frontend clients
@app.websocket("/ws/frontend")
async def frontend_ws(websocket: WebSocket):
    await websocket.accept()
    frontend_clients.add(websocket)
    # Send the current state upon connection
    await websocket.send_json({"event": "state_update", "state": state})
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "next_letter":
                if state["mode"] == "braille_mode" and state["current_letter_index"] < len(state["current_word"]):
                    # Get the letter at the current index and update its braille representation
                    letter = state["current_word"][state["current_letter_index"]]
                    state["pins"] = braille_pins(letter)
                    state["current_letter_index"] += 1
                    await broadcast_state()
            else:
                print("Unknown action received on frontend socket:", action, flush=True)
    except WebSocketDisconnect:
        frontend_clients.remove(websocket)
