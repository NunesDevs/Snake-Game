# Snake Game

Este é um jogo simples de "Snake" feito em Python usando a biblioteca `pygame`. O objetivo do jogo é controlar a cobra, comer a comida e crescer. O jogo termina quando a cobra bate nas bordas ou colide consigo mesma.

## Como Rodar

### Pré-requisitos

1. Instalar o Python (recomendado Python 3.6 ou superior).
2. Instalar a biblioteca `pygame`.

### Instalação

1. Clone o repositório:
    ```bash
    git clone https://github.com/NunesDevs/Snake-Game.git
    cd Snake-Game
    ```

2. Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```

### Executando o Jogo

1. Execute o jogo com o seguinte comando:
    ```bash
    python main.py
    ```

2. Use as teclas de seta para controlar a cobra (cima, baixo, esquerda, direita).

## Estrutura do Repositório

- `game/game.py`: Contém o código principal do jogo.
- `main.py`: Arquivo para iniciar o jogo.
- `requirements.txt`: Lista de dependências.
- `.gitignore`: Arquivos a serem ignorados pelo Git.
- `README.md`: Documentação do projeto.

## Contribuições

Se você tiver sugestões ou melhorias para o jogo, fique à vontade para contribuir! Basta criar um fork do repositório, fazer suas alterações e enviar um pull request.

---

Desenvolvido por NunesDevs.

## Operação e arquitetura verificadas

main.py chama gameLoop em game/game.py. O módulo define o jogo e inicializa a janela somente quando essa função é chamada.

Arquivos principais: `main.py`, `game/game.py`, `requirements.txt`.

### Requisitos e execução

Python 3, Pygame e ambiente gráfico.

```text
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python main.py
python -m unittest discover -s tests -v
```



### Testes e estado

A suíte unittest valida importação sem abrir janela e o ciclo de encerramento com um substituto controlado de PyGame. Ela não substitui o teste visual com PyGame instalado.

Estado: projeto de estudo/experimental. Deploy ativo não foi confirmado nesta revisão.

### Limitações conhecidas

- Teste de inicialização usou PyGame simulado; renderização real e controles precisam teste em janela.
- Dependência pygame==2.4.0 precisa ambiente compatível para instalação.

### Licença e manutenção

Nenhum arquivo de licença foi identificado nesta revisão; não foi adicionada uma nova licença. Atualize comandos e limitações quando houver mudança de comportamento.
