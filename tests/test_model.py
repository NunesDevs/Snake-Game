from dataclasses import replace
import unittest
from game.model import create_game, start, turn, pause, resume, reset, step, advance, place_food, arena_walls
from game.game import action

class ModelTests(unittest.TestCase):
    def test_grid_food_and_finite_full_board(self):
        for cols in (4, 24, 64):
            game = create_game(cols=cols, rng=lambda: 0)
            self.assertEqual(len(set(game.body)), 3)
            self.assertTrue(all(0 <= x < cols and 0 <= y < game.rows for x, y in game.body))
            self.assertNotIn(game.food, game.body)
        self.assertIsNone(place_food(tuple((x, y) for y in range(4) for x in range(4)), 4, 4))

    def test_queue_blocks_reversal_and_multiple_turns(self):
        game = start(create_game())
        self.assertIs(turn(game, "left"), game)
        queued = turn(game, "up")
        self.assertIs(turn(queued, "left"), queued)
        moved = step(queued)
        self.assertEqual(moved.body[0], (game.body[0][0], game.body[0][1] - 1))
        self.assertEqual(moved.direction, "up")
        self.assertEqual(game.direction, "right")

    def test_eating_grows_immediately_and_safe_food(self):
        game = start(create_game(mode="arena"))
        game = replace(game, food=(game.body[0][0] + 1, game.body[0][1]))
        result = step(game, lambda: 0)
        self.assertEqual(result.score, 10)
        self.assertEqual(len(result.body), len(game.body) + 1)
        self.assertNotIn(result.food, result.body + result.walls)
        self.assertEqual(game.score, 0)

    def test_classic_wall_and_body_collisions(self):
        base = start(create_game())
        self.assertEqual(step(replace(base, body=((23, 2), (22, 2)))).status, "gameover")
        bent = replace(base, body=((2, 2), (2, 3), (3, 3), (3, 2), (4, 2)), food=(9, 9))
        self.assertEqual(step(bent).status, "gameover")

    def test_departing_tail_is_free(self):
        base = start(create_game())
        game = replace(base, body=((2, 2), (2, 3), (3, 3), (3, 2)), food=(9, 9))
        self.assertEqual(step(game).status, "running")

    def test_portals_wrap_all_edges_and_reject_body(self):
        base = start(create_game(mode="portal"))
        for head, direction, expected in (((23, 2), "right", (0, 2)), ((0, 2), "left", (23, 2)),
                                          ((2, 0), "up", (2, 19)), ((2, 19), "down", (2, 0))):
            moved = step(replace(base, body=(head,), direction=direction, food=(9, 9)))
            self.assertEqual(moved.body[0], expected)
        game = replace(base, body=((23, 2), (0, 2), (1, 2)))
        self.assertEqual(step(game).status, "gameover")

    def test_arena_corridors_are_connected_and_start_is_fair(self):
        for cols in (4, 10, 24, 64):
            for rows in (4, 8, 20, 64):
                game = create_game(cols, rows, mode="arena")
                self.assertFalse(set(game.body) & set(game.walls))
                self.assertNotIn(game.food, game.walls)
                walls, seen, queue = set(game.walls), {(0, 0)}, [(0, 0)]
                for x, y in queue:
                    for cell in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                        if 0 <= cell[0] < cols and 0 <= cell[1] < rows and cell not in walls | seen:
                            seen.add(cell)
                            queue.append(cell)
                self.assertEqual(len(seen), cols * rows - len(walls))
        game = start(create_game(mode="arena"))
        x, y = game.walls[0]
        self.assertEqual(step(replace(game, body=((x-1, y),))).status, "gameover")

    def test_fourth_food_bonus_is_separate_and_awards_thirty_once(self):
        game = start(create_game())
        game = replace(game, eaten=3, food=(game.body[0][0] + 1, game.body[0][1]))
        result = step(game, lambda: 0)
        self.assertEqual(result.eaten, 4)
        self.assertNotIn(result.bonus, result.body + result.walls + (result.food,))
        target = replace(result, bonus=(result.body[0][0] + 1, result.body[0][1]), food=(0, 0))
        moved = step(target)
        self.assertEqual(moved.score, 40)
        self.assertEqual(len(moved.body), len(result.body))
        self.assertIsNone(moved.bonus)

    def test_bonus_never_blocks_the_last_regular_cell(self):
        base = start(create_game(4, 4))
        cells = tuple((x, y) for y in range(4) for x in range(4) if (x, y) not in ((3, 0), (3, 3), (2, 0)))
        game = replace(base, body=((2, 0),) + cells, food=(3, 0), bonus=(3, 3))
        moved = step(game, lambda: 0)
        self.assertEqual(moved.status, "running")
        self.assertEqual(moved.food, (3, 3))
        self.assertIsNone(moved.bonus)

    def test_complete_board_wins_without_retry_loop(self):
        base = start(create_game(4, 4))
        cells = tuple((x, y) for y in range(4) for x in range(4) if (x, y) not in ((3, 0), (2, 0)))
        game = replace(base, body=((2, 0),) + cells, food=(3, 0))
        self.assertEqual(step(game).status, "won")
        self.assertIsNone(step(game).food)

    def test_pause_restart_mode_rate_and_adapter_actions(self):
        game = start(replace(create_game(mode="arena"), score=70))
        paused = pause(game)
        self.assertIs(advance(paused, 100), paused)
        self.assertEqual(resume(paused).status, "running")
        self.assertEqual(action(game).status, "paused")
        self.assertEqual(action(paused).status, "running")
        fresh = reset(paused, rate=12)
        self.assertEqual((fresh.mode, fresh.base_rate, fresh.score, fresh.best), ("arena", 12, 0, 70))
        self.assertEqual(reset(fresh, mode="portal").mode, "portal")

    def test_frame_gap_bounds_and_validation(self):
        game = start(create_game())
        self.assertEqual(advance(game, 100000), advance(game, 250))
        for value in (float("nan"), float("inf"), -1, 0, True, None, "10"):
            self.assertIs(advance(game, value), game)
        for kwargs in ({"cols": 3}, {"rows": True}, {"mode": "bad"}, {"rate": 0}, {"rate": True}, {"rate": float("nan")}):
            with self.assertRaises(ValueError):
                create_game(**kwargs)

if __name__ == "__main__":
    unittest.main()
