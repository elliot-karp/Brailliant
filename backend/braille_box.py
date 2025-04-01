# functions here read the state of the box as well as define methods to send commands to the box to display certain shapes

# function which takes a letter and returns the braille representation in 6 pin format 
#{2}{3}
#{1}{4}
#{0}{5}
# --> {0,1,2,3,4,5} these are the array representation 
import random

def braille_pins(letter):
    braille_dict = {
        'a': [1, 0, 0, 0, 0, 0],
        'b': [1, 0, 1, 0, 0, 0],
        'c': [1, 1, 0, 0, 0, 0],
        'd': [1, 1, 0, 1, 0, 0],
        'e': [1, 0, 0, 1, 0, 0],
        'f': [1, 1, 1, 0, 0, 0],
        'g': [1, 1, 1, 1, 0, 0],
        'h': [1, 0, 1, 1, 0, 0],
        'i': [0, 1, 1, 0, 0, 0],
        'j': [0, 1, 1, 1, 0, 0],
        'k': [1, 0, 0, 0, 1, 0],
        'l': [1, 0, 1, 0, 1, 0],
        'm': [1, 1, 0, 0, 1, 0],
        'n': [1, 1, 0, 1, 1, 0],
        'o': [1, 0, 0, 1, 1, 0],
        'p': [1, 1, 1, 0, 1, 0],
        'q': [1, 1, 1, 1, 1, 0],
        'r': [1, 0, 1, 1, 1, 0],
        's': [0, 1, 1, 0, 1, 0],
        't': [0, 1, 1, 1, 1, 0],
        'u': [1, 0, 0, 0, 1, 1],
        'v': [1, 0, 1, 0, 1, 1],
        'w': [0, 1, 1, 1, 0, 1],
        'x': [1, 1, 0, 0, 1, 1],
        'y': [1, 1, 0, 1, 1, 1],
        'z': [1, 0, 0, 1, 1, 1]
    }

    letter = letter.lower()
    return braille_dict.get(letter, [0, 0, 0, 0, 0, 0]) 
braille_pins("l")



def get_random_word():
    words = [
        "apple", "bread", "chair", "dance", "earth", "flame", "grape", "horse", "input", "juice",
        "knife", "lemon", "magic", "night", "ocean", "plant", "quiet", "river", "stone", "table",
        "under", "voice", "water", "youth", "zebra", "brick", "cloud", "drink", "eagle", "fresh",
        "grass", "happy", "ivory", "jelly", "knock", "light", "money", "north", "opine", "paint",
        "quick", "round", "shelf", "train", "union", "valid", "watch", "xenon", "yield", "zebra"
    ]
    return random.choice(words)
