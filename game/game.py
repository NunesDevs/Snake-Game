"""Pygame adapter for the pure grid model. Importing this module opens no window."""
from pathlib import Path
from .model import create_game, start, turn, pause, resume, reset, advance

WIDTH, HEIGHT = 900, 800
BG, SURFACE, RAISED = "#05070a", "#111418", "#1c1f24"
TEXT, MUTED, LINE, BLUE = "#f2f2f2", "#a8adb5", "#303740", "#007bff"
AMBER, GREEN, ACTION = "#ffca72", "#66d9ac", "#005bc7"
MODES = (("classic", "Clássico"), ("portal", "Portais"), ("arena", "Arena"))
FONT_DIR = Path(__file__).parent / "assets" / "fonts"

def action(game):
    if game.status == "running":
        return pause(game)
    if game.status == "paused":
        return resume(game)
    return start(reset(game)) if game.status in ("gameover", "won") else start(game)

def draw_game(pygame, screen, game, fonts):
    """Render the actual game view and return the clickable control regions."""
    body_font, small_font, title_font, value_font = fonts
    def label(value, pos, font=body_font, color=TEXT):
        screen.blit(font.render(str(value), True, color), pos)
    def box(rect, color, radius=12, border=None):
        pygame.draw.rect(screen, color, rect, border_radius=radius)
        if border:
            pygame.draw.rect(screen, border, rect, width=1, border_radius=radius)
    def button(rect, text, selected=False):
        box(rect, ACTION if selected else RAISED, 8, BLUE if selected else LINE)
        image = body_font.render(text, True, TEXT)
        screen.blit(image, image.get_rect(center=rect.center))
    screen.fill(BG)
    label("PLAYGROUND / 03", (32, 20), small_font, BLUE)
    label("Snake Grid", (32, 42), title_font)
    label("Explore portais, supere a arena e colete bônus.", (32, 82), body_font, MUTED)
    controls = []
    for index, (mode, title) in enumerate(MODES):
        rect = pygame.Rect(32 + index * 126, 112, 116, 44)
        button(rect, title, game.mode == mode)
        controls.append((rect, ("mode", mode)))
    rect = pygame.Rect(650, 112, 218, 44)
    button(rect, f"Ritmo inicial: {game.base_rate:g}/s")
    controls.append((rect, ("rate", None)))
    for index, (title, value) in enumerate((("Pontos", f"{game.score:05d}"),
                                             ("Recorde da sessão", f"{game.best:05d}"),
                                             ("Ritmo", f"{game.rate:g}/s"))):
        x = 32 + index * 282
        box(pygame.Rect(x, 172, 272, 72), RAISED)
        label(title, (x + 16, 181), small_font, MUTED)
        label(value, (x + 16, 201), value_font)
    box(pygame.Rect(32, 260, 836, 400), SURFACE, 12, LINE)
    cell = min(800 // game.cols, 400 // game.rows)
    left = (WIDTH - game.cols * cell) // 2
    top = 260 + (400 - game.rows * cell) // 2
    for col in range(game.cols + 1):
        pygame.draw.line(screen, LINE, (left + col * cell, top),
                         (left + col * cell, top + game.rows * cell))
    for row in range(game.rows + 1):
        pygame.draw.line(screen, LINE, (left, top + row * cell),
                         (left + game.cols * cell, top + row * cell))
    if game.mode == "portal":
        pygame.draw.rect(screen, BLUE, (left, top, game.cols * cell, game.rows * cell), width=2)
    for x, y in game.walls:
        rect = pygame.Rect(left + x * cell + 1, top + y * cell + 1, cell - 2, cell - 2)
        box(rect, MUTED, 3)
        pygame.draw.line(screen, LINE, rect.bottomleft, rect.topright, width=3)
    for index, (x, y) in enumerate(game.body):
        box(pygame.Rect(left + x * cell + 1, top + y * cell + 1, cell - 2, cell - 2),
            BLUE if index == 0 else "#005bc7", 4)
    if game.food:
        x, y = game.food
        pygame.draw.circle(screen, AMBER, (left + x * cell + cell // 2, top + y * cell + cell // 2), cell // 3)
    if game.bonus:
        x, y = game.bonus
        cx, cy = left + x * cell + cell // 2, top + y * cell + cell // 2
        pygame.draw.polygon(screen, GREEN, ((cx, cy - 8), (cx + 8, cy), (cx, cy + 8), (cx - 8, cy)))
        pygame.draw.line(screen, BG, (cx - 4, cy), (cx + 4, cy), 2)
        pygame.draw.line(screen, BG, (cx, cy - 4), (cx, cy + 4), 2)
    if game.status != "running":
        titles = {"ready": "Escolha sua próxima rota.", "paused": "Jogo pausado",
                  "gameover": "Fim de jogo.", "won": "Tabuleiro completo!"}
        hints = {"ready": "Enter ou setas para começar.", "paused": "P ou Espaço para continuar.",
                 "gameover": "R ou Enter para jogar de novo.", "won": "R ou Enter para jogar de novo."}
        box(pygame.Rect(228, 370, 444, 124), BG, 12, LINE)
        for text, font, y, color in ((titles[game.status], value_font, 389, TEXT),
                                     (hints[game.status], body_font, 441, MUTED)):
            image = font.render(text, True, color)
            screen.blit(image, image.get_rect(center=(WIDTH // 2, y + image.get_height() // 2)))
    toggle = "Pausar" if game.status == "running" else "Continuar" if game.status == "paused" else "Jogar de novo" if game.status in ("gameover", "won") else "Começar"
    for x, width, title, command in ((32, 150, toggle, "toggle"), (194, 130, "Reiniciar", "reset")):
        rect = pygame.Rect(x, 678, width, 44)
        button(rect, title, command == "toggle")
        controls.append((rect, (command, None)))
    label("Comida: +10  ·  Bônus verde a cada 4 comidas: +30", (352, 689), small_font, MUTED)
    label("Setas / WASD: mover  ·  P / Espaço: pausar  ·  R: reiniciar  ·  1 / 2 / 3: modo", (32, 744), small_font, MUTED)
    label("© 2026 NunesDevs · Código sob licença MIT.", (32, 771), small_font, MUTED)
    return controls

def gameLoop(max_frames=None, capture_path=None, initial_mode="classic"):
    """Run the desktop app; optional bounded capture supports reproducible visual QA."""
    import pygame
    pygame.init()
    try:
        screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("Snake Grid — NunesDevs")
        fonts = (pygame.font.Font(str(FONT_DIR / "dm-sans.ttf"), 16),
                 pygame.font.Font(str(FONT_DIR / "dm-sans.ttf"), 13),
                 pygame.font.Font(str(FONT_DIR / "space-grotesk.ttf"), 32),
                 pygame.font.Font(str(FONT_DIR / "space-grotesk.ttf"), 24))
        clock, game, running, frames = pygame.time.Clock(), create_game(mode=initial_mode), True, 0
        controls = draw_game(pygame, screen, game, fonts)
        directions = {pygame.K_UP: "up", pygame.K_w: "up", pygame.K_DOWN: "down",
                      pygame.K_s: "down", pygame.K_LEFT: "left", pygame.K_a: "left",
                      pygame.K_RIGHT: "right", pygame.K_d: "right"}
        def command(state, name, value=None):
            if name == "mode":
                return reset(state, mode=value)
            if name == "rate":
                rates = (6, 8, 12)
                return reset(state, rate=rates[(rates.index(state.base_rate) + 1) % len(rates)])
            return reset(state) if name == "reset" else action(state)
        while running:
            delta = clock.tick(60)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                    break
                if event.type == getattr(pygame, "WINDOWFOCUSLOST", -1):
                    game = pause(game)
                elif event.type == pygame.KEYDOWN:
                    if event.key in directions:
                        game = turn(start(game), directions[event.key])
                    elif event.key in (pygame.K_SPACE, pygame.K_p, pygame.K_RETURN):
                        game = action(game)
                    elif event.key == pygame.K_r:
                        game = reset(game)
                    elif event.key in (pygame.K_1, pygame.K_2, pygame.K_3):
                        game = reset(game, mode=MODES[(pygame.K_1, pygame.K_2, pygame.K_3).index(event.key)][0])
                elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                    for rect, (name, value) in controls:
                        if rect.collidepoint(event.pos):
                            game = command(game, name, value)
                            break
            if not running:
                break
            game = advance(game, delta)
            controls = draw_game(pygame, screen, game, fonts)
            pygame.display.flip()
            frames += 1
            if max_frames is not None and frames >= max_frames:
                break
        if capture_path is not None:
            pygame.image.save(screen, str(capture_path))
    finally:
        pygame.quit()
