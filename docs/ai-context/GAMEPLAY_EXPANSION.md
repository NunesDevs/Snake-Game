# Ampliação dos jogos — 2026-11-15

A primeira publicação do portfólio precedeu esta fase, respeitando a prioridade do proprietário. Mudanças em branch isolada codex/gameplay-expansion. Design: oito novas telas editáveis no Figma e cinco variantes de vetores, reutilizando tokens, tipografia, métricas e botões existentes. Nenhuma UI achatada usada como implementação.

Clássico/Portais/Arena; barreiras com corredores livres; bônus +30 após quatro comidas; tratamento da última célula; modelo Python puro e interface Pygame real; alimentos livres, grade alinhada, uma curva por passo e crescimento imediato.

Validação: 21 testes Node sem skips; sete fluxos Playwright e oito larguras320/360/390/430/768/1024/1440/1920, zero erros de JavaScript/console/rede/HTTP e overflow. 13 testes Python passaram e duas superfícies reais SDL foram capturadas; Pygame2.6.1 wheel oficial validada porSHA256 e pipcheck0. Teste com mock cobre apenas import/fechamento, não substitui a captura real. Revisão independente de lógica sem bloqueios; tipo bool em rate Python foi recusado para paridade. Build runtime14 arquivos com preflight que preserva arquivos desconhecidos e recusa links/junctions.

As tentativas iniciais do harness com método Clock.uninstall inexistente e relógio sem pausa não contam como aprovadas; foram corrigidas para contextos isolados e pausa explícita, seguidas de execução completa verde. A aplicação não foi alterada para encobrir falhas de teste.

Próximos gates: commit e push da branch, CI remota, fast-forward de main autorizado, release correspondente e importação apenas do runtime aprovado para o portfólio. Deploy só é concluído após verificar domínio e bytes publicados.

CI remota inicial e6536a8 não criou jobs por comando pip em scalar YAML com dois-pontos; movido para bloco literal em commit separado. Esta falha não altera o SHA do código/runtime capturado. Execução remota verde continua sendo gate obrigatório antes da integração.
