**Backlog Executável do Lab-FON Editor (Windows)**

## 1. Regras operacionais do backlog
1. Não iniciar história sem critérios de aceite definidos.
2. Cada história deve terminar com testes relevantes passando e build validado.
3. Não avançar para publicação sem gates de validação e geração concluídos.
4. Não introduzir backend, banco, nuvem obrigatória ou edição livre de HTML/CSS/JS.
5. Sempre preservar separação dados/adapters/renderização/build.

## 2. Definition of Ready (DoR)
1. Objetivo funcional da história está claro para usuário leigo.
2. Dependências técnicas da história estão resolvidas.
3. Critérios de aceite são testáveis.
4. Risco principal está identificado.
5. Estratégia de teste está definida.

## 3. Definition of Done (DoD)
1. Código implementado e revisado.
2. Testes unitários e de integração da história passaram.
3. Build do site validado.
4. Sem regressão funcional no fluxo existente.
5. Mensagens de erro e UX mínima para usuário leigo implementadas.
6. Documentação curta da entrega registrada.

## 4. Épicos e histórias

### EPIC E1 — Fundação do app desktop e abertura de projeto
Objetivo: iniciar o editor e abrir um projeto Lab-FON válido sem alterar conteúdo.

Definição operacional de projeto válido para o editor:
1. Projeto válido é a pasta de artefatos gerada pelo build (`dist`).
2. O editor de conteúdo opera sobre os arquivos dessa pasta (`dist`) para manutenção da página única.
3. O app deve rejeitar pastas que não representem uma saída de build válida.
4. A origem de abertura pode ser: pasta local `dist` ou diretório remoto acessível via FTP com artefatos equivalentes de build.
5. Em modo FTP, a edição ocorre sobre uma cópia local de trabalho sincronizada a partir do remoto; sem edição direta no servidor durante o carregamento.

1. E1-H1 Bootstrap do app desktop
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: nenhuma
- Critérios de aceite:
1. App abre no Windows.
2. Estrutura mínima de navegação disponível.
3. Não altera arquivos do projeto.
- Testes:
1. Smoke test de inicialização.
2. Teste de erro de inicialização com mensagem clara.

2. E1-H2 Seleção da origem do projeto (local ou FTP)
- Prioridade: P0
- Estimativa: 3 pontos
- Dependências: E1-H1
- Critérios de aceite:
1. Usuário pode abrir projeto por pasta local `dist` ou por origem remota via FTP.
2. Origem selecionada (caminho local ou perfil FTP + diretório remoto) é persistida na sessão.
3. Cancelar seleção não quebra o app.
4. No modo FTP, o app baixa/sincroniza os artefatos para uma pasta local de trabalho antes de validar.
- Testes:
1. Fluxo selecionar/cancelar.
2. Reabertura de origem local recente na sessão.
3. Reabertura de origem FTP recente na sessão.

3. E1-H3 Validação de estrutura mínima do projeto
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E1-H2
- Critérios de aceite:
1. Projeto local `dist` válido (gerado por build) é aceito.
2. Projeto remoto via FTP é aceito somente se, após sincronização local, atender aos critérios de estrutura de build válida.
3. Estruturas que não sejam saída de build válida são rejeitadas com diagnóstico objetivo.
4. Nenhuma modificação é feita no servidor remoto nesta etapa.
- Testes:
1. Casos válidos e inválidos para origem local `dist`.
2. Casos válidos e inválidos para origem FTP (incluindo autenticação, timeout e diretório remoto incorreto).
3. Mensagens de erro por tipo de falta estrutural de artefatos do build.

---

### EPIC E2 — Leitura de conteúdo e modelo interno de página
Objetivo: carregar e representar a página como sequência de seções editáveis.

1. E2-H1 Adaptador de leitura do conteúdo atual (definido em EPIC E1)
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E1-H3
- Critérios de aceite:
1. Conteúdo atual é lido sem exigir edição manual de JSON.
2. Campos essenciais são normalizados para modelo interno.
3. Falhas de leitura são reportadas com causa.
- Testes:
1. Unitários de parsing/normalização.
2. Casos com campos ausentes e valores inválidos.

2. E2-H2 Modelo de página com ordem de seções
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E2-H1
- Critérios de aceite:
1. Página é representada como lista ordenada de seções.
2. Tipos de seção existentes são reconhecidos.
3. Ordem original é preservada ao carregar.
- Testes:
1. Testes de ordenação e consistência.
2. Teste com conteúdo real em cópia.

3. E2-H3 Round-trip seguro de dados
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E2-H2
- Critérios de aceite:
1. Ler e salvar sem edição não altera semântica dos dados.
2. Referências e integridade permanecem válidas.
3. Diferenças estruturais indevidas não são introduzidas.
- Testes:
1. Teste de round-trip com comparação estrutural.
2. Testes de integridade de referências.

---

### EPIC E3 — Edição estruturada de seções
Objetivo: permitir edição sem exposição de código técnico.

1. E3-H1 Edição de conteúdo por formulário (tipos iniciais)
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E2-H3
- Critérios de aceite:
1. Usuário edita campos por formulário.
2. Não há editor livre de HTML/CSS/JS.
3. Alterações ficam restritas à seção editada.
- Testes:
1. Unitários de atualização de campos.
2. Regressão de isolamento entre seções.

2. E3-H2 Adicionar e remover seção
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E3-H1
- Critérios de aceite:
1. Usuário adiciona seção de tipo predefinido.
2. Usuário remove seção com confirmação.
3. Integridade geral da página permanece válida.
- Testes:
1. Casos de inserção e remoção.
2. Verificação de estrutura após operação.

3. E3-H3 Reordenar seção
- Prioridade: P0
- Estimativa: 3 pontos
- Dependências: E3-H2
- Critérios de aceite:
1. Usuário reordena seções.
2. Ordem final persiste após salvar/reabrir.
3. Conteúdo da seção não é alterado no processo.
- Testes:
1. Cenários de reorder múltiplo.
2. Persistência de ordem.

4. E3-H4 Duplicar seção (quando aplicável)
- Prioridade: P1
- Estimativa: 5 pontos
- Dependências: E3-H2
- Critérios de aceite:
1. Duplicação respeita regras do tipo.
2. IDs/referências duplicadas inválidas são tratadas.
3. Seção duplicada aparece em posição previsível.
- Testes:
1. Casos permitidos e bloqueados.
2. Integridade após duplicação.

5. E3-H5 Gestão de imagens e arquivos associados
- Prioridade: P1
- Estimativa: 8 pontos
- Dependências: E3-H1
- Critérios de aceite:
1. Adicionar, substituir e remover arquivo associado.
2. Referências quebradas são detectadas.
3. Falhas de IO geram mensagens claras.
- Testes:
1. Upload/substituição/remoção.
2. Validação de caminho e referência.

---

### EPIC E4 — Validação e persistência segura
Objetivo: bloquear estados inválidos e melhorar confiança operacional.

1. E4-H1 Motor de validação central
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E3-H3
- Critérios de aceite:
1. Valida obrigatórios, tipos, referências, arquivos e estrutura.
2. Retorna lista de erros por seção/campo.
3. Pode ser chamado antes de salvar, gerar e publicar.
- Testes:
1. Cobertura de regras por categoria.
2. Casos limite de validação.

2. E4-H2 Operação Validar na interface
- Prioridade: P0
- Estimativa: 3 pontos
- Dependências: E4-H1
- Critérios de aceite:
1. Botão Validar executa todas as verificações.
2. Resultado é exibido de forma clara.
3. Usuário consegue navegar para o erro.
- Testes:
1. Fluxo sem erro e com erro.
2. Navegação para itens inválidos.

3. E4-H3 Persistência com proteção de integridade
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E4-H1
- Critérios de aceite:
1. Salvamento mantém consistência entre seções.
2. Falha parcial de escrita não corrompe estado.
3. Histórico de alteração local mínima disponível.
- Testes:
1. Simulação de falhas de escrita.
2. Reabertura após salvar.

---

### EPIC E5 — Preview integrado com renderização real
Objetivo: mostrar resultado fiel com os renderizadores existentes.

1. E5-H1 Painel de preview integrado
- Prioridade: P1
- Estimativa: 8 pontos
- Dependências: E4-H3
- Critérios de aceite:
1. Preview usa os mesmos componentes/renderizadores do site.
2. Estrutura geral da página aparece corretamente.
3. Falha de renderização é capturada com diagnóstico.
- Testes:
1. Testes funcionais de renderização por seção.
2. Regressão de compatibilidade do preview.

2. E5-H2 Alternância editar/visualizar
- Prioridade: P1
- Estimativa: 3 pontos
- Dependências: E5-H1
- Critérios de aceite:
1. Usuário alterna rapidamente entre modos.
2. Estado de edição não é perdido.
3. Preview reflete alterações válidas recentes.
- Testes:
1. Troca de modo com alterações pendentes.
2. Persistência de contexto do usuário.

---

### EPIC E6 — Geração do site com pipeline existente
Objetivo: validar, gerar e exibir resultado efetivo do build.

1. E6-H1 Operação Gerar site (com gate de validação)
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E4-H2
- Critérios de aceite:
1. Geração só inicia se validação passar.
2. Pipeline de build atual é usado sem reescrita.
3. Logs de sucesso/falha são exibidos.
- Testes:
1. Build com conteúdo válido.
2. Bloqueio com conteúdo inválido.

2. E6-H2 Visualização do artefato gerado
- Prioridade: P1
- Estimativa: 5 pontos
- Dependências: E6-H1
- Critérios de aceite:
1. Usuário visualiza resultado gerado antes de publicar.
2. Artefato exibido corresponde ao build mais recente.
3. Erro de visualização é tratado.
- Testes:
1. Cenário de build e preview de artefato.
2. Cenário de build inexistente/obsoleto.

---

### EPIC E7 — Publicação FTP segura + backup + auditoria
Objetivo: publicar com segurança e rastreabilidade.

1. E7-H1 Configuração FTP
- Prioridade: P1
- Estimativa: 5 pontos
- Dependências: E6-H1
- Critérios de aceite:
1. Configurar host, usuário, destino e opções.
2. Validar campos de configuração.
3. Salvar configuração sem expor segredo em texto plano.
- Testes:
1. Validação de formulário FTP.
2. Carregamento de configuração salva.

2. E7-H2 Armazenamento seguro de credenciais no Windows
- Prioridade: P1
- Estimativa: 8 pontos
- Dependências: E7-H1
- Critérios de aceite:
1. Credenciais ficam em armazenamento seguro do Windows.
2. Não são gravadas em texto plano no projeto.
3. Falhas de acesso ao cofre são tratadas.
- Testes:
1. Salvar/ler/remover credencial.
2. Cenários de permissão negada.

3. E7-H3 Teste de conexão FTP
- Prioridade: P1
- Estimativa: 3 pontos
- Dependências: E7-H1
- Critérios de aceite:
1. Botão Testar conexão retorna status claro.
2. Timeout e autenticação inválida são diferenciados.
3. Resultado não altera conteúdo local.
- Testes:
1. Conexão bem-sucedida.
2. Falha de rede e credencial.

4. E7-H4 Publicar com gates obrigatórios
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E7-H2, E7-H3, E6-H1
- Critérios de aceite:
1. Publicação exige validação e build válidos.
2. Upload inclui apenas artefatos do build.
3. Erros interrompem processo com rollback local adequado.
- Testes:
1. Publicação de sucesso.
2. Interrupção no meio do upload e tratamento.

5. E7-H5 Backup pré-publicação e log de publicação
- Prioridade: P0
- Estimativa: 5 pontos
- Dependências: E7-H4
- Critérios de aceite:
1. Backup local automático antes de publicar.
2. Log registra data, hora, arquivos e erro eventual.
3. Logs são consultáveis no app.
- Testes:
1. Criação de backup sempre antes do upload.
2. Registro de sucesso e falha.

---

### EPIC E8 — Hardening, acessibilidade e prontidão para usuário leigo
Objetivo: fechar lacunas de UX, robustez e qualidade final.

1. E8-H1 UX orientada a usuário não técnico
- Prioridade: P1
- Estimativa: 5 pontos
- Dependências: E7-H5
- Critérios de aceite:
1. Mensagens e fluxo sem jargão técnico desnecessário.
2. Erros indicam ação de correção.
3. Fluxo principal completo é compreensível.
- Testes:
1. Teste guiado de fluxo com checklist.
2. Verificação de clareza de mensagens.

2. E8-H2 Reforço de acessibilidade na interface do editor
- Prioridade: P1
- Estimativa: 5 pontos
- Dependências: E5-H2
- Critérios de aceite:
1. Navegação por teclado nas telas principais.
2. Hierarquia semântica e labels adequados.
3. Contraste e foco visível em componentes críticos.
- Testes:
1. Testes de navegação por teclado.
2. Verificações de acessibilidade de interface.

3. E8-H3 Teste ponta a ponta de aceite final
- Prioridade: P0
- Estimativa: 8 pontos
- Dependências: E8-H1, E8-H2
- Critérios de aceite:
1. Fluxo completo roda sem edição manual de JSON/HTML/CSS/JS.
2. Build final compatível com hospedagem estática.
3. Publicação FTP executável com logs e backup.
- Testes:
1. Cenário completo de edição até publicação.
2. Validação pós-publicação em ambiente de homologação.

## 5. Ordem recomendada por sprint (executável)

### Sprint 1
1. E1-H1
2. E1-H2
3. E1-H3
4. E2-H1

Meta: abrir projeto e carregar conteúdo inicial.

### Sprint 2
1. E2-H2
2. E2-H3
3. E3-H1
4. E3-H2

Meta: representação de página e edição básica.

### Sprint 3
1. E3-H3
2. E3-H4
3. E3-H5
4. E4-H1
5. E4-H2

Meta: operações completas de seção e validação robusta.

### Sprint 4
1. E4-H3
2. E5-H1
3. E5-H2
4. E6-H1
5. E6-H2

Meta: salvar com segurança, preview fiel e geração do site.

### Sprint 5
1. E7-H1
2. E7-H2
3. E7-H3
4. E7-H4
5. E7-H5

Meta: publicação segura com backup e auditoria.

### Sprint 6
1. E8-H1
2. E8-H2
3. E8-H3

Meta: prontidão final para usuário leigo.

## 6. Gates de passagem entre fases
1. Gate A (após Sprint 2): leitura + edição básica + integridade preservada.
2. Gate B (após Sprint 4): validar + preview + gerar site funcionando.
3. Gate C (após Sprint 5): publicar com backup e logs, com bloqueios corretos.
4. Gate Final (após Sprint 6): fluxo completo executável por usuário leigo.

## 7. Backlog técnico transversal (sempre ativo)
1. BT-1 Observabilidade local de erros: logs técnicos e logs amigáveis.
2. BT-2 Testes de regressão de dados e referências.
3. BT-3 Controle de mudanças pequenas e reversíveis.
4. BT-4 Documentação curta por história entregue.
5. BT-5 Verificação recorrente de compatibilidade com build estático.

## 8. Checklist de execução imediata (etapa inicial)

### 8.1 Especificação formal de `dist` válida (para E1-H3)

Critérios bloqueantes (obrigatórios para aceitar o projeto):
1. A origem deve estar acessível para leitura.
2. Em origem local: caminho existente e legível.
3. Em origem FTP: conexão e download/sincronização local concluídos com sucesso.
4. A raiz validada deve conter `index.html`.
5. A raiz validada deve conter `data.json` (fonte principal de conteúdo).
6. A raiz validada deve conter ao menos uma pasta de artefatos estáticos: `assets/` ou `js/` ou `css/`.
7. `index.html` e `data.json` não podem estar vazios (tamanho > 0).

Critérios não bloqueantes (aceitar com aviso):
1. Ausência de `publication_references.json` quando a seção de publicações estiver habilitada no template.
2. Arquivos de mídia referenciados no conteúdo com ausência física detectada.

Critérios de rejeição imediata:
1. Ausência de `index.html`.
2. Ausência de `data.json`.
3. Falha de autenticação FTP, timeout, ou diretório remoto inexistente/inacessível.
4. Estrutura incompatível com saída de build estático (sem artefatos mínimos).

Formato mínimo de diagnóstico (para testes e UI):
1. `code` (ex.: `DIST_MISSING_INDEX`, `FTP_TIMEOUT`).
2. `message` amigável para usuário leigo.
3. `details` técnico opcional.
4. `path` ou `remotePath` associado ao erro.
5. `severity` (`error` ou `warning`).

### 8.2 Fluxo formal de abertura de projeto (local e FTP)

Objetivo:
1. Permitir abertura segura de projeto válido a partir de pasta local `dist` ou diretório remoto via FTP.
2. Garantir que toda validação e edição ocorra sobre uma cópia local de trabalho.

Estados de UI (máquina de estados mínima):
1. `idle`: tela aguardando ação de abrir projeto.
2. `selectingSource`: usuário escolhe origem (`local` ou `ftp`).
3. `collectingInput`: app coleta caminho local ou parâmetros FTP.
4. `acquiringSnapshot`: app prepara cópia local de trabalho.
5. `validatingSnapshot`: app executa validação E1-H3 na cópia local.
6. `ready`: projeto aberto e habilitado para leitura/edição.
7. `error`: abertura falhou; usuário recebe diagnóstico e opção de tentar novamente.

Fluxo A — abertura local:
1. Usuário seleciona origem `local`.
2. Usuário escolhe a pasta alvo (`dist`).
3. App verifica acesso de leitura ao caminho.
4. App cria/atualiza cópia local de trabalho em diretório interno de sessão.
5. App valida a cópia local com os critérios da seção 8.1.
6. Se válido: estado `ready`.
7. Se inválido: estado `error` com diagnóstico estruturado.

Fluxo B — abertura via FTP:
1. Usuário seleciona origem `ftp`.
2. Usuário informa perfil FTP (host, porta, usuário, diretório remoto, modo passivo quando aplicável).
3. App testa conexão e autenticação.
4. App sincroniza snapshot remoto para pasta local de trabalho (somente leitura no remoto nesta etapa).
5. App valida a cópia local com os critérios da seção 8.1.
6. Se válido: estado `ready`.
7. Se inválido: estado `error` com diagnóstico estruturado.

Regras operacionais obrigatórias:
1. Não editar diretamente a origem remota durante abertura.
2. Toda validação e leitura de conteúdo ocorre na cópia local de trabalho.
3. A última origem válida (local/FTP) deve ser persistida para reabertura.
4. Cancelamento em qualquer etapa retorna para `idle` sem efeitos colaterais.

Tratamento mínimo de erros por categoria:
1. Origem local inacessível (`LOCAL_PATH_NOT_FOUND`, `LOCAL_ACCESS_DENIED`).
2. Conexão FTP (`FTP_AUTH_FAILED`, `FTP_TIMEOUT`, `FTP_REMOTE_NOT_FOUND`).
3. Sincronização (`FTP_SYNC_FAILED`).
4. Estrutura inválida (`DIST_MISSING_INDEX`, `DIST_MISSING_DATA_JSON`, `DIST_INVALID_STRUCTURE`).

Critérios de aceite da etapa de fluxo:
1. Abertura local válida atinge `ready` e disponibiliza snapshot local.
2. Abertura FTP válida atinge `ready` e disponibiliza snapshot local sincronizado.
3. Toda falha cai em `error` com `code`, `message`, `severity` e caminho associado.
4. Nenhuma falha altera dados da origem remota.

### 8.3 Casos de teste E1-H3 — origem local (válido/inválido)

Convenções de resultado:
1. `status`: `accepted`, `rejected` ou `accepted_with_warning`.
2. `state`: estado final esperado da UI (`ready` ou `error`).
3. `code`: código principal esperado no diagnóstico.

| ID | Cenário | Pré-condição | Entrada | Resultado esperado |
| --- | --- | --- | --- | --- |
| L-01 | Dist local válida mínima | Pasta existe e é legível | `index.html` + `data.json` + `assets/` e arquivos não vazios | `status=accepted`, `state=ready`, sem erro |
| L-02 | Dist válida com `js/` sem `assets/` | Pasta existe e é legível | `index.html` + `data.json` + `js/` e arquivos não vazios | `status=accepted`, `state=ready`, sem erro |
| L-03 | Dist válida com `css/` sem `assets/` e sem `js/` | Pasta existe e é legível | `index.html` + `data.json` + `css/` e arquivos não vazios | `status=accepted`, `state=ready`, sem erro |
| L-04 | Caminho inexistente | Nenhuma | Caminho local não existe | `status=rejected`, `state=error`, `code=LOCAL_PATH_NOT_FOUND` |
| L-05 | Sem permissão de leitura | Diretório protegido | Caminho local inacessível | `status=rejected`, `state=error`, `code=LOCAL_ACCESS_DENIED` |
| L-06 | Ausência de `index.html` | Pasta legível | `data.json` presente, `index.html` ausente | `status=rejected`, `state=error`, `code=DIST_MISSING_INDEX` |
| L-07 | Ausência de `data.json` | Pasta legível | `index.html` presente, `data.json` ausente | `status=rejected`, `state=error`, `code=DIST_MISSING_DATA_JSON` |
| L-08 | `index.html` vazio | Pasta legível | `index.html` tamanho 0 | `status=rejected`, `state=error`, `code=DIST_EMPTY_INDEX` |
| L-09 | `data.json` vazio | Pasta legível | `data.json` tamanho 0 | `status=rejected`, `state=error`, `code=DIST_EMPTY_DATA_JSON` |
| L-10 | Sem pasta de artefatos estáticos | Pasta legível | `index.html` + `data.json`, sem `assets/`, `js/`, `css/` | `status=rejected`, `state=error`, `code=DIST_INVALID_STRUCTURE` |
| L-11 | `publication_references.json` ausente | Template com publicações | Estrutura válida sem arquivo de publicações | `status=accepted_with_warning`, `state=ready`, `code=DIST_MISSING_PUBLICATIONS_FILE` |
| L-12 | Mídia referenciada ausente | Estrutura válida | `data.json` referencia arquivo inexistente | `status=accepted_with_warning`, `state=ready`, `code=DIST_MISSING_MEDIA_FILE` |

Asserções obrigatórias para todos os casos locais:
1. O diagnóstico inclui `code`, `message`, `severity` e `path`.
2. Em `rejected`, o estado final é `error` e a edição não é habilitada.
3. Em `accepted`/`accepted_with_warning`, o estado final é `ready`.

### 8.4 Casos de teste E1-H3 — origem FTP (válido/inválido)

Convenções de resultado:
1. `status`: `accepted`, `rejected` ou `accepted_with_warning`.
2. `state`: estado final esperado da UI (`ready` ou `error`).
3. `code`: código principal esperado no diagnóstico.

| ID | Cenário | Pré-condição | Entrada | Resultado esperado |
| --- | --- | --- | --- | --- |
| F-01 | FTP válido com snapshot íntegro | Servidor FTP acessível | Credenciais corretas + diretório remoto com `index.html` + `data.json` + `assets/` | `status=accepted`, `state=ready`, sem erro |
| F-02 | FTP válido com `js/` sem `assets/` | Servidor FTP acessível | Credenciais corretas + diretório remoto com `index.html` + `data.json` + `js/` | `status=accepted`, `state=ready`, sem erro |
| F-03 | FTP válido com `css/` sem `assets/` e sem `js/` | Servidor FTP acessível | Credenciais corretas + diretório remoto com `index.html` + `data.json` + `css/` | `status=accepted`, `state=ready`, sem erro |
| F-04 | Usuário/senha inválidos | Servidor responde ao host/porta | Credenciais incorretas | `status=rejected`, `state=error`, `code=FTP_AUTH_FAILED` |
| F-05 | Timeout de conexão | Rede degradada ou host indisponível | Credenciais corretas, sem resposta no tempo limite | `status=rejected`, `state=error`, `code=FTP_TIMEOUT` |
| F-06 | Diretório remoto incorreto | Credenciais corretas | `remotePath` inexistente | `status=rejected`, `state=error`, `code=FTP_REMOTE_NOT_FOUND` |
| F-07 | Falha durante sincronização | Conexão estabelecida | Queda de conexão no download para cópia local | `status=rejected`, `state=error`, `code=FTP_SYNC_FAILED` |
| F-08 | Snapshot sem `index.html` | Sync concluído | Cópia local sem `index.html` | `status=rejected`, `state=error`, `code=DIST_MISSING_INDEX` |
| F-09 | Snapshot sem `data.json` | Sync concluído | Cópia local sem `data.json` | `status=rejected`, `state=error`, `code=DIST_MISSING_DATA_JSON` |
| F-10 | Snapshot com `index.html` vazio | Sync concluído | `index.html` tamanho 0 na cópia local | `status=rejected`, `state=error`, `code=DIST_EMPTY_INDEX` |
| F-11 | Snapshot com `data.json` vazio | Sync concluído | `data.json` tamanho 0 na cópia local | `status=rejected`, `state=error`, `code=DIST_EMPTY_DATA_JSON` |
| F-12 | Snapshot sem artefatos estáticos mínimos | Sync concluído | Sem `assets/`, `js/` e `css/` na cópia local | `status=rejected`, `state=error`, `code=DIST_INVALID_STRUCTURE` |
| F-13 | `publication_references.json` ausente | Sync concluído + template com publicações | Estrutura válida sem arquivo de publicações | `status=accepted_with_warning`, `state=ready`, `code=DIST_MISSING_PUBLICATIONS_FILE` |
| F-14 | Mídia referenciada ausente | Sync concluído | `data.json` referencia mídia inexistente na cópia local | `status=accepted_with_warning`, `state=ready`, `code=DIST_MISSING_MEDIA_FILE` |

Asserções obrigatórias para todos os casos FTP:
1. O diagnóstico inclui `code`, `message`, `severity` e `remotePath` (ou `path` local do snapshot quando aplicável).
2. Em `rejected`, o estado final é `error` e a edição não é habilitada.
3. Em `accepted`/`accepted_with_warning`, o estado final é `ready`.
4. Em todos os cenários FTP, não há modificação no servidor remoto durante a abertura.

### 8.5 Formato padrão de diagnóstico de erro (contrato final)

Objetivo do contrato:
1. Padronizar mensagens para UI, logs e testes automatizados.
2. Permitir rastreabilidade por código e origem (local/FTP).

Estrutura do diagnóstico (objeto):
1. `code` (string, obrigatório): identificador estável do evento.
2. `severity` (enum, obrigatório): `error` ou `warning`.
3. `message` (string, obrigatório): mensagem amigável para usuário leigo.
4. `details` (string, opcional): contexto técnico para debug.
5. `origin` (enum, obrigatório): `local` ou `ftp`.
6. `path` (string, condicional): caminho local relacionado ao diagnóstico.
7. `remotePath` (string, condicional): caminho remoto FTP relacionado ao diagnóstico.
8. `stage` (enum, obrigatório): `selectingSource`, `acquiringSnapshot`, `validatingSnapshot`.
9. `timestamp` (string ISO-8601, obrigatório): data/hora do diagnóstico.
10. `hint` (string, opcional): ação recomendada ao usuário.

Regras de validação do contrato:
1. `code`, `severity`, `message`, `origin`, `stage` e `timestamp` são sempre obrigatórios.
2. `path` é obrigatório quando `origin=local`.
3. `remotePath` é obrigatório quando `origin=ftp` e o erro for de conexão/diretório remoto.
4. Em diagnósticos de estrutura inválida após sync FTP, `path` deve apontar para a cópia local de trabalho.
5. `message` deve evitar jargão técnico e descrever impacto prático.
6. `details` não deve conter credenciais, tokens ou segredos.

Catálogo mínimo de códigos:
1. Local: `LOCAL_PATH_NOT_FOUND`, `LOCAL_ACCESS_DENIED`.
2. FTP conexão: `FTP_AUTH_FAILED`, `FTP_TIMEOUT`, `FTP_REMOTE_NOT_FOUND`.
3. FTP sincronização: `FTP_SYNC_FAILED`.
4. Estrutura dist: `DIST_MISSING_INDEX`, `DIST_MISSING_DATA_JSON`, `DIST_EMPTY_INDEX`, `DIST_EMPTY_DATA_JSON`, `DIST_INVALID_STRUCTURE`.
5. Avisos: `DIST_MISSING_PUBLICATIONS_FILE`, `DIST_MISSING_MEDIA_FILE`.

Exemplo (erro local):

```json
{
	"code": "DIST_MISSING_DATA_JSON",
	"severity": "error",
	"message": "Não foi possível abrir o projeto: o arquivo data.json não foi encontrado.",
	"details": "Arquivo obrigatório ausente na raiz validada.",
	"origin": "local",
	"path": "C:/projeto/dist",
	"stage": "validatingSnapshot",
	"timestamp": "2026-08-26T14:20:00Z",
	"hint": "Gere novamente o build e selecione a pasta dist correta."
}
```

Exemplo (erro FTP):

```json
{
	"code": "FTP_AUTH_FAILED",
	"severity": "error",
	"message": "Não foi possível conectar ao servidor FTP com as credenciais informadas.",
	"details": "Resposta 530 do servidor FTP durante autenticação.",
	"origin": "ftp",
	"remotePath": "/public_html/labfonac",
	"stage": "acquiringSnapshot",
	"timestamp": "2026-08-26T14:21:00Z",
	"hint": "Revise usuário, senha e permissões do diretório remoto."
}
```

Exemplo (aviso):

```json
{
	"code": "DIST_MISSING_MEDIA_FILE",
	"severity": "warning",
	"message": "Alguns arquivos de mídia referenciados no conteúdo não foram encontrados.",
	"details": "3 referências em data.json apontam para arquivos ausentes.",
	"origin": "local",
	"path": "C:/projeto/dist",
	"stage": "validatingSnapshot",
	"timestamp": "2026-08-26T14:22:00Z",
	"hint": "Verifique as mídias ausentes antes de publicar."
}
```

### Dia 1 — Definições e testes de validação
- [x] Especificar formalmente o que caracteriza `dist` válida (arquivos e estrutura mínima obrigatória).
- [x] Especificar o fluxo de abertura local e o fluxo de abertura via FTP com sincronização local.
- [x] Criar casos de teste para E1-H3 cobrindo local válido/inválido.
- [x] Criar casos de teste para E1-H3 cobrindo FTP válido/inválido, autenticação, timeout e diretório incorreto.
- [x] Definir formato padrão de diagnóstico de erro para validação de projeto.

### Dia 2 — Implementação mínima de produção para E1
- [x] Implementar E1-H1 com estrutura mínima de navegação e estado de abertura de projeto.
- [x] Implementar E1-H2 com seleção de origem local e FTP.
- [ ] Implementar sincronização inicial FTP para pasta local de trabalho (somente leitura no remoto nesta etapa).
- [ ] Implementar E1-H3 usando a mesma rotina de validação para origem local e cópia local sincronizada do FTP.
- [ ] Validar o aceite de E1 completo: abrir origem local/FTP válida, rejeitar inválida e exibir diagnóstico claro.
