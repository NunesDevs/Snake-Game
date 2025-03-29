import pygame
import random

# Inicializa o Pygame
pygame.init()

# Configurações da tela
WIDTH, HEIGHT = 600, 400
TILE_SIZE = 20
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Snake Game Enhaced")

# Cores
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)

# Clock
clock = pygame.time.Clock()

class Snake:
    def __init__(self):
        self.body = [(100, 100), (90, 100), (80, 100)]
        self.direction = (TILE_SIZE, 0)
        self.growing = False
    
    def move(self):
        head_x, head_y = self.body[0]
        dir_x, dir_y = self.direction
        new_head = (head_x + dir_x, head_y + dir_y)
        
        if not self.growing:
            self.body.pop()
        self.body.insert(0, new_head)
        self.growing = False

    def grow(self):
        self.growing = True
    
    def draw(self):
        for segment in self.body:
            pygame.draw.rect(screen, GREEN, (*segment, TILE_SIZE, TILE_SIZE))

    def check_collision(self):
        head = self.body[0]
        if head in self.body[1:] or not (0 <= head[0] < WIDTH and 0 <= head[1] < HEIGHT):
            return True
        return False

class Food:
    def __init__(self):
        self.position = (random.randint(0, (WIDTH // TILE_SIZE) - 1) * TILE_SIZE,
                         random.randint(0, (HEIGHT // TILE_SIZE) - 1) * TILE_SIZE)
    
    def draw(self):
        pygame.draw.rect(screen, RED, (*self.position, TILE_SIZE, TILE_SIZE))
    
    def respawn(self):
        self.position = (random.randint(0, (WIDTH // TILE_SIZE) - 1) * TILE_SIZE,
                         random.randint(0, (HEIGHT // TILE_SIZE) - 1) * TILE_SIZE)

# Inicializa o jogo
snake = Snake()
food = Food()
score = 0
difficulty = 10

running = True
while running:
    screen.fill(WHITE)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP and snake.direction != (0, TILE_SIZE):
                snake.direction = (0, -TILE_SIZE)
            elif event.key == pygame.K_DOWN and snake.direction != (0, -TILE_SIZE):
                snake.direction = (0, TILE_SIZE)
            elif event.key == pygame.K_LEFT and snake.direction != (TILE_SIZE, 0):
                snake.direction = (-TILE_SIZE, 0)
            elif event.key == pygame.K_RIGHT and snake.direction != (-TILE_SIZE, 0):
                snake.direction = (TILE_SIZE, 0)
    
    snake.move()
    
    if snake.body[0] == food.position:
        food.respawn()
        snake.grow()
        score += 10
        difficulty += 1
    
    if snake.check_collision():
        pygame.time.delay(1000)
        running = False
    
    snake.draw()
    food.draw()
    
    pygame.display.flip()
    clock.tick(difficulty)

pygame.quit()
