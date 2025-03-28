import asyncio
import websockets
import json

async def simulate_input_letter():
    uri = "ws://localhost:5000/ws/button"
    async with websockets.connect(uri) as websocket:
        print("Connected as Button!")

        while True:
            input("Press Enter to simulate GPIO button press...")
            custom_pins = [0,0,1,0,1,0]
            await websocket.send(json.dumps({
                "pins": custom_pins
            }))
            print("Sent pins:", custom_pins)

asyncio.run(simulate_input_letter())