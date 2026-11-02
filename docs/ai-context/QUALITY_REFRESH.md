# Memória técnica vigente — revisão de qualidade

Revisão: 2026-11-01. O aplicativo Python/Pygame permanece independente. A nova demo web fica em `web/` e foi desenhada no Figma antes de ser implementada.

`web/engine.mjs` usa células inteiras e passos discretos. Comida nasce em célula livre; a fila aceita uma mudança de direção por movimento e rejeita inversão imediata. A cauda que está saindo pode ser ocupada no mesmo passo; o tabuleiro cheio encerra a geração de comida. `web/main.mjs` trata Canvas, teclado, botões/gestos, pausa automática e reinício. A ponte valida host, identificador, pontuação e altura, inclusive em storage bloqueado por sandbox.

`tools/build-web.mjs` exporta somente o runtime browser e seus avisos legais. Nenhum código Python, configuração, documento ou banco é incluído. O runtime não consulta serviços externos. Fontes locais mantêm SIL Open Font License; código próprio usa MIT autorizada pelo titular.

Validação: `node --test tests/*.test.mjs`, `node --check web/main.mjs`, `node tools/build-web.mjs`; browser com teclado, toque, comida/pontuação, pausa, reinício, colisão, sandbox e oito larguras. `python -m unittest discover -s tests -v` continua validando o launcher com Pygame controlado, sem equivaler a renderização real. A dependência desktop existente continua `pygame==2.4.0` e exige revisão de compatibilidade na etapa desktop.

Prioridade: publicar o baseline browser junto do portfólio antes de novas mecânicas. Melhorias adicionais do aplicativo Python e embalagem desktop são uma etapa distinta.

Correção integrada de resize: o cálculo de desenho está em `web/render-layout.mjs`. Dimensões temporariamente nulas ou pequenas demais não geram paths; segmentos e raio são limitados a valores válidos. Treze testes Node passaram, incluindo geometrias mínimas. Uma regressão real em iframe sandbox percorreu nove dimensões (inclusive 0, 1 e 16 px), em DPR 1 e 2: dezoito casos sem pageerror, com desenho restaurado e pausa funcional.
