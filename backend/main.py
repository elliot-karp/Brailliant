from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from braille_box import braille_pins

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

connected_clients = set()
frontend_clients = set()
button_clients = set()
user_input = set() 
current_word = ""
current_letter_index = 0
user_attempts = []

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

class SetWord(BaseModel):
    word: str

@app.post("/api/setword")
async def set_word(data: SetWord):
    global current_word, current_letter_index, user_attempts
    current_word = data.word.lower()
    current_letter_index = 0
    user_attempts = []
    return {"status": "word set"}



@app.websocket("/ws/frontend")
async def frontend_ws(websocket: WebSocket):
    await websocket.accept()
    frontend_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data["event"] == "next_letter":
                if current_letter_index < len(current_word):
                    letter = current_word[current_letter_index]
                    pins = braille_pins(letter)
                    await websocket.send_json({"event": "show_letter", "pins": pins})
                    current_letter_index += 1
            elif data["event"] == "perkins_input":
                values = data["values"]
                user_attempts.append(values)
                print("Stored Perkins input:", values, flush=True)
    except WebSocketDisconnect:
        frontend_clients.remove(websocket)

# Later, the GPIO hardware would call this method:
async def gpio_button_pressed(values):
    user_attempts.append(values)
    for frontend in frontend_clients:
        await frontend.send_json({"event": "show_letter", "pins": values})
        
@app.websocket("/ws/button")
async def button_ws(websocket: WebSocket):
    await websocket.accept()
    button_clients.add(websocket)
    print("Button script connected. Total buttons:", len(button_clients))
    try:
        while True:
            data = await websocket.receive_json()
            print("Button event received:", data, flush=True)

            # When button sends pins, broadcast ONLY to frontend clients
            pins = data.get("pins", [])
            if pins:
                disconnected = []
                for frontend in frontend_clients:
                    try:
                        await frontend.send_json({"event": "show_letter", "pins": pins})
                        # TODO send pins to the device. this will be another function somewhere
                    except WebSocketDisconnect:
                        disconnected.append(frontend)

                # Clean up disconnected frontends
                for frontend in disconnected:
                    frontend_clients.remove(frontend)

    except WebSocketDisconnect:
        button_clients.remove(websocket)
        print("Button script disconnected.")

class SetWord(BaseModel):
    word: str

current_word = ""
current_index = 0
connected_clients = []

@app.post("/api/setword")
async def set_word(data: SetWord):
    global current_word, current_index
    current_word = data.word.lower()
    current_index = 0
    print("Word set to:", current_word)
    return {"status": "word set"}

