from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from braille_box import  braille_pins

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class Attempt(BaseModel):
    values: list[int]
class LetterInput(BaseModel):
    letter: str
class Setword(BaseModel):
    word: str


@app.post("/api/word")
def submit_attempt(data: LetterInput):
    print("FE requested letter:", data.letter)
    return {"result": braille_pins(data.letter)}

def get_word():
    return {"word": "WATER"}

@app.post("/api/braille")
def submit_attempt(data: LetterInput):
    print("FE requested letter:", data.letter)
    return {"result": braille_pins(data.letter)}

@app.post("/api/attempt") 
def submit_attempt(data: Attempt):
    print("User attempt:", data.values)
    return {"result": "placeholder feedback"}
