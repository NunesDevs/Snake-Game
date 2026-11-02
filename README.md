# Snake Game / Snake Grid

Jogo Snake com aplicativo desktop Python/Pygame e uma demo independente para navegador. A interface da demo web foi desenhada no Figma; o aplicativo Python foi preservado.

## Demo web

- Setas ou **WASD** movem a cobra; botões direcionais e gestos atendem telas de toque.
- **P / Espaço** pausa ou continua; **R** reinicia.
- Pontuação, crescimento ao comer e melhor resultado.
- Velocidade inicial ajustável. A mudança reinicia a partida.
- Colisão com paredes ou corpo encerra a partida.
- Pausa automática ao perder foco ou ocultar a experiência.

A comida nasce em uma célula livre. As entradas são limitadas a uma mudança de direção por movimento e não permitem inversão imediata. O caso de tabuleiro completo encerra a simulação sem entrar em loop de geração de comida.

Node.js 22 ou superior; a demo não precisa de pacotes de instalação.

```sh
node --test tests/*.test.mjs
node --check web/main.mjs
node tools/build-web.mjs
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Abra `http://127.0.0.1:8000`. `dist/` contém somente HTML, JavaScript, CSS, vetores, fontes e licenças necessários. A pasta do aplicativo desktop não é copiada para a demo.

`web/engine.mjs` contém a engine de grade, independente do Canvas e de timers. `web/main.mjs` conecta renderização e controles. A ponte em `web/bridge.mjs` permite ao host de um iframe isolado controlar pausa, persistir recordes e ajustar a altura. Falhas de storage em origem opaca são tratadas; o host deve liberar CORS para os recursos públicos.

## Aplicativo desktop

```sh
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python main.py
python -m unittest discover -s tests -v
```

O aplicativo usa `main.py` e `game/game.py`, com `pygame==2.4.0` conforme o manifesto existente. Requer um ambiente gráfico e uma versão de Python compatível com esse pacote. A revisão de inicialização usa um substituto controlado de Pygame; não equivale a uma sessão gráfica real.

## Validação

A engine web tem testes de células, comida, crescimento, pontuação, fila de direção, colisões, movimento para a cauda que está saindo, tabuleiro completo, pausa e reinício. As pontes têm testes de mensagens inválidas, limites, storage e altura. No navegador, teclado, toque, pontuação e iframe isolado foram exercitados; oito larguras entre 320 e 1920 px ficaram sem overflow.

## Licença

MIT em `LICENSE` para o código próprio. Fontes DM Sans e Space Grotesk acompanham seus avisos SIL Open Font License em `web/assets/fonts/`. As licenças dos componentes de terceiros continuam aplicáveis a eles.
