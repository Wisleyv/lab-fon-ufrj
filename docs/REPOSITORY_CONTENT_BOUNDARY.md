# Identidade, licença e limite entre software e dados

Nota de contexto: este registro conserva a evidência do checkpoint e suas ressalvas. A pendência de avaliação de produção foi encerrada pela [convergência aceita](PRODUCTION_CONVERGENCE_2026-10-03.md). Consulte o [handover técnico](ARCHITECTURE_AND_OPERATIONS_HANDOVER.md) para operação e custódia atuais.

Registro do checkpoint de 2026-10-03, posterior a `71581ea`.

## Correção do caminho de desenvolvimento

A passagem anterior alterou o worktree da versão anterior (`f8dd5aa`), enquanto o comando de desenvolvimento era executado no worktree post-v1 (`71581ea`). Nesse worktree, a implementação autoritativa já era `desktop/editor-menu.cjs`, instalada por `desktop/main.cjs`. O texto antigo foi reproduzido no aplicativo real antes da correção.

A correção foi aplicada ao menu existente, preservando os menus em português, os papéis nativos, a janela proprietária do diálogo, a prevenção de diálogos duplicados e o tratamento de falhas. Não foi introduzido um segundo módulo Sobre, nem substituído o código post-v1 pelo código do worktree anterior. Alterações no processo principal do Electron exigem reiniciar o aplicativo; o recarregamento do renderer Vite não substitui o processo principal.

Depois do reinício por `npm run editor:dev`, o processo real confirmou a execução no worktree post-v1. O callback do menu Ajuda instalado nesse processo foi acionado pelo depurador nativo, sem mocks ou alteração da implementação. A janela nativa foi lida por Windows UI Automation e conferida visualmente em captura restrita ao diálogo. Evidência bruta, imagens e cópias descartáveis permanecem ignoradas em `.temp/`, fora do commit.

## Conteúdo observado no diálogo

Título: **Sobre o Editor Labfonac**.

> Editor Labfonac — Versão 1.0.0
>
> Ferramenta de manutenção do site do Laboratório de Fonética Acústica - UFRJ. Requer um projeto compatível com o fluxo de trabalho do laboratório e, para publicação, acesso a um servidor configurado para esse projeto.
>
> Concepção e desenvolvimento: Wisley Vilela
> Financiamento: PPGLEV/UFRJ
>
> Software de código aberto sob a MIT License.

Botões, em ordem: **Fechar**, **Guia do usuário**, **Código-fonte**, **Licença MIT**, **Última versão**. Fechar continua sendo a ação padrão e de cancelamento.

A versão vem de `app.getVersion()`, que usa os metadados do aplicativo. Pacote e lockfile permanecem em `1.0.0`; não houve mudança de versão, tag ou release. Os links usam destinos HTTPS fixos: guia em `docs/GUIA-DO-USUARIO.md`, raiz do repositório, texto MIT oficial em `https://opensource.org/license/mit` e `releases/latest`. O botão de licença funciona independentemente de um futuro merge a `main`, que ainda não contém o novo arquivo. O texto canônico do projeto permanece em `LICENSE`, ligado pelo README e incluído na distribuição. Este checkpoint não realiza merge a `main`.

## Licença

O pacote, o lockfile e o README já declaravam MIT, mas faltava um arquivo canônico rastreado. `LICENSE` contém o texto MIT e foi incluído na lista existente de arquivos distribuídos, sem executar empacotamento. Pacote, README, guia e diálogo descrevem a autoria, o financiamento e a licença de forma consistente. O aplicativo é o **Editor Labfonac**; o identificador histórico de instalação `Lab-FON Editor` foi preservado no pacote.

A licença do software não concede direitos sobre conteúdo institucional, registros pessoais ou fotografias mantidos fora deste repositório.

## Software e conteúdo institucional

Foram removidos do índice Git **182 arquivos institucionais** do worktree post-v1: dados canônicos de `content/`, dados públicos gerados, referências bibliográficas, fotografias e outras imagens de conteúdo, inventário de imagens e documentos-fonte de conteúdo institucional. Todos permanecem disponíveis localmente. A verificação SHA-256 antes/depois confirmou zero diferenças.

Permanecem públicos o software, contratos, documentação técnica, configuração estática de hospedagem, ícones/marca necessários à apresentação e placeholders genéricos. `.gitignore` protege as pastas de conteúdo, fotografias, credenciais locais, recuperação e snapshots. Arquivos preexistentes em outros worktrees não foram alterados ou incluídos neste checkpoint.

`examples/content/` contém apenas registros fictícios, textos sintéticos e URLs de exemplo. Testes que antes liam registros institucionais usam esses exemplos mantendo os contratos de composição, categorias, ordenação, texto e renderização. A categoria Egressos continua disponível e pode ser testada com uma pessoa fictícia; nenhum membro removido é restaurado no conteúdo institucional local.

Sem `content/` na raiz, `npm run build` usa os exemplos para gerar um demonstrativo. Esse resultado não deve ser publicado como conteúdo institucional. O projeto institucional local/remoto continua usando `content/`, os adaptadores e os renderizadores existentes. A fonte canônica, a sincronização remota e os recursos de recuperação/guiados do checkpoint anterior não foram alterados.

O build público mantém somente `index.html`; o build desktop mantém somente `editor.html` e desabilita a cópia de `public/`. A marca do Editor é importada como asset de software de `src/assets/images/editor-brand.png`, preservando a imagem do cabeçalho sem depender da cópia de imagens públicas. Assim, os dados e fotografias locais não entram incidentalmente no aplicativo desktop.

O histórico Git continua contendo conteúdo institucional. Remoções na versão corrente não apagam commits anteriores, refs, clones ou artefatos de releases. Qualquer expurgo histórico exige uma decisão posterior explícita, com inventário e preservação privada dos dados.

## Verificação e limites

- O conteúdo solicitado foi observado na janela Sobre real do aplicativo iniciado por `npm run editor:dev` no worktree correto.
- **120 testes focados passaram** numa cópia contendo somente software, documentação, assets permitidos e exemplos sintéticos, sem `content/` ou fotografias institucionais. Dependências instaladas foram reutilizadas. A marca importada também foi confirmada carregada no aplicativo de desenvolvimento real.
- `npm run build` passou nessa cópia e produziu `index.html` e `data.json` sintético, sem `editor.html`.
- `npm run build:editor-renderer` passou com saída de verificação separada e produziu `editor.html`, CSS, JS e a marca importada como asset de software, sem dados ou cópia de `public/`. Não foi executado `editor:build` ou `electron-builder`.
- A suíte completa foi executada: 567 de 578 testes passaram na primeira execução, com 11 falhas e seis rejeições decorrentes dos mocks de inicialização. Os mocks antigos não forneciam `Menu` ao menu nativo já existente. Foram corrigidos somente esses dois mocks; os 35 testes de menu, inicialização nativa e mídia passaram sem rejeições não tratadas.
- As seis falhas restantes são anteriores a esta tarefa e foram reproduzidas com o código original de `71581ea`: quatro em `editor-photo-integration.test.js`, uma em `custom-sections.test.js` e uma em `editor-initialization.test.js`. A suíte geral não está totalmente verde; não se afirma que essas falhas foram corrigidas. Na interface, somente a referência ao asset da marca foi alterada; a lógica de edição, o fluxo remoto e a recuperação permanecem iguais ao checkpoint anterior.
- Os 182 arquivos institucionais locais foram preservados byte a byte. A revisão do diff exclui credenciais, configuração de máquina, recuperação, snapshots e evidência bruta. Documentação técnica/histórica pode conter referências contextuais a pessoas ou caminhos; não é fonte de conteúdo do Editor.

## Ponto de partida para a convergência de produção

Continuar a avaliação a partir desta branch post-v1 e de seu novo checkpoint, não do worktree anterior. O conteúdo institucional local preservado continua disponível para comparação posterior; o build demonstrativo não é sua substituição. Consultar também [o handoff post-v1](POST_V1_SESSION_HANDOFF.md) e a evidência de aceitação anterior.

A próxima etapa é a avaliação separadamente autorizada da correspondência entre o software post-v1, a fonte institucional preservada, a fonte remota e o site publicado. Este checkpoint não estabelece equivalência com o estado atual do servidor, pois não houve acesso ao FTP de produção.

Não houve migração, alteração da produção, reescrita histórica, force-push, empacotamento, tag, release ou execução de limpeza. Os testes de FTP existentes utilizaram apenas destinos locais descartáveis.
