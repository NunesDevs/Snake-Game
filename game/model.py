"""Pure Snake model shared conceptually with the browser engine; no pygame or I/O."""
from dataclasses import dataclass, replace
from math import isfinite
from random import random as random_value

DIRECTIONS = {"up": (0, -1), "down": (0, 1), "left": (-1, 0), "right": (1, 0)}
MODES = ("classic", "portal", "arena")

def arena_walls(cols, rows):
    if cols < 10 or rows < 8:
        return ()
    start, length = int(cols * 0.45), max(2, cols // 5)
    return tuple((x, y) for y in (rows // 4, rows - 1 - rows // 4)
                 for x in range(start, start + length))

def place_food(body, cols, rows, rng=random_value, walls=()):
    occupied = set(body) | set(walls)
    free = [(i % cols, i // cols) for i in range(cols * rows)
            if (i % cols, i // cols) not in occupied]
    if not free:
        return None
    value = rng()
    fraction = max(0, min(0.999999999, value)) if type(value) in (int, float) and isfinite(value) else 0.5
    return free[int(fraction * len(free))]

@dataclass(frozen=True)
class Game:
    cols: int
    rows: int
    mode: str
    base_rate: float
    rate: float
    body: tuple
    walls: tuple
    food: tuple | None
    bonus: tuple | None = None
    eaten: int = 0
    direction: str = "right"
    queued: str | None = None
    status: str = "ready"
    score: int = 0
    best: int = 0
    remainder: float = 0

def create_game(cols=24, rows=20, rate=8, mode="classic", best=0, rng=random_value):
    if not all(type(v) is int and 4 <= v <= 64 for v in (cols, rows)):
        raise ValueError("Grid dimensions must be integers between 4 and 64")
    if type(rate) not in (int, float) or not isfinite(rate) or not 1 <= rate <= 20:
        raise ValueError("Rate must be between 1 and 20")
    if mode not in MODES:
        raise ValueError("Unknown mode")
    x, y = max(2, cols // 3), rows // 2
    body = ((x, y), (x - 1, y), (x - 2, y))
    walls = arena_walls(cols, rows) if mode == "arena" else ()
    best = best if type(best) is int and 0 <= best <= 10**9 else 0
    return Game(cols, rows, mode, rate, rate, body, walls,
                place_food(body, cols, rows, rng, walls), best=best)

def start(game):
    return replace(game, status="running", remainder=0) if game.status == "ready" else game

def turn(game, direction):
    if direction not in DIRECTIONS:
        raise ValueError("Unknown direction")
    a, b = DIRECTIONS[direction], DIRECTIONS[game.direction]
    if (game.status not in ("running", "ready") or game.queued
            or direction == game.direction or (a[0] + b[0] == 0 and a[1] + b[1] == 0)):
        return game
    return replace(game, queued=direction)

def pause(game):
    return replace(game, status="paused", remainder=0) if game.status == "running" else game

def resume(game):
    return replace(game, status="running", remainder=0) if game.status == "paused" else game

def reset(game, mode=None, rate=None, rng=random_value):
    return create_game(game.cols, game.rows, game.base_rate if rate is None else rate,
                       game.mode if mode is None else mode, max(game.best, game.score), rng)

def step(game, rng=random_value):
    if game.status != "running":
        return game
    direction = game.queued or game.direction
    dx, dy = DIRECTIONS[direction]
    head = (game.body[0][0] + dx, game.body[0][1] + dy)
    if game.mode == "portal":
        head = (head[0] % game.cols, head[1] % game.rows)
    eat, eat_bonus = head == game.food, game.bonus is not None and head == game.bonus
    occupied = game.body if eat else game.body[:-1]
    if (not 0 <= head[0] < game.cols or not 0 <= head[1] < game.rows
            or head in game.walls or head in occupied):
        return replace(game, status="gameover", queued=None, remainder=0)
    body = (head,) + (game.body if eat else game.body[:-1])
    eaten = game.eaten + int(eat)
    score = game.score + 10 * eat + 30 * eat_bonus
    bonus = None if eat_bonus else game.bonus
    food = place_food(body + ((bonus,) if bonus else ()), game.cols, game.rows,
                      rng, game.walls) if eat else game.food
    if eat and food is None and bonus:
        bonus = None
        food = place_food(body, game.cols, game.rows, rng, game.walls)
    if eat and eaten % 4 == 0 and bonus is None and food:
        bonus = place_food(body + (food,), game.cols, game.rows, rng, game.walls)
    return replace(game, body=body, direction=direction, queued=None, food=food,
                   bonus=bonus, eaten=eaten, score=score, best=max(game.best, score),
                   rate=min(20, game.base_rate + score // 50),
                   status="won" if food is None else "running")

def advance(game, delta_ms, rng=random_value):
    if game.status != "running" or type(delta_ms) not in (int, float) or not isfinite(delta_ms) or delta_ms <= 0:
        return game
    game = replace(game, remainder=game.remainder + min(250, delta_ms))
    while game.status == "running" and game.remainder + 1e-8 >= 1000 / game.rate:
        game = step(replace(game, remainder=max(0, game.remainder - 1000 / game.rate)), rng)
    return game
