import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch


class StartupTests(unittest.TestCase):
    def test_import_is_safe_and_launcher_runs_one_quit_frame(self):
        pygame = MagicMock()
        pygame.QUIT = 256
        pygame.KEYDOWN = 768
        pygame.event.get.return_value = [SimpleNamespace(type=pygame.QUIT)]
        source = Path(__file__).resolve().parents[1] / "game" / "game.py"
        spec = importlib.util.spec_from_file_location("snake_game_test", source)
        module = importlib.util.module_from_spec(spec)

        with patch.dict(sys.modules, {"pygame": pygame}):
            spec.loader.exec_module(module)
            self.assertTrue(callable(module.gameLoop))
            pygame.init.assert_not_called()
            module.gameLoop()

        pygame.init.assert_called_once()
        pygame.display.set_mode.assert_called_once_with((600, 400))
        pygame.quit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
