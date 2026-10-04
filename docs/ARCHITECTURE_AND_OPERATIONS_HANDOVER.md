# Arquitetura e operações — handover técnico final

Entrega técnica de 2026-10-03: **Editor Labfonac v1.1.0**, `main` e tag `v1.1.0`. O tag identifica o commit final da release; sua equivalência com a fonte efetivamente empacotada `bc6ca74ddfd963e5433b67447c4c16fa4804228f` e o checkpoint documental `e2b02ada41e2bfab1a8ee6cdbc10ecb514a68dee` está no [registro de proveniência/aceitação](RELEASE_CANDIDATE_1.1.0.md). Este handover finaliza a orientação técnica; não afirma transferência já recebida de arquivos privados ou credenciais. Operação cotidiana: [guia do usuário](GUIA-DO-USUARIO.md).

Destinos oficiais: [site institucional](https://posvernaculas.letras.ufrj.br/labfonac/), [repositório público](https://github.com/Wisleyv/lab-fon-ufrj), [release v1.1.0](https://github.com/Wisleyv/lab-fon-ufrj/releases/tag/v1.1.0) e [guia vigente em main](https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md). A release contém instalador, ZIP portátil, SHA256SUMS e notas; dados institucionais e backups não são assets públicos.

## 1. Finalidade e restrições institucionais

O site do Laboratório de Fonética Acústica - UFRJ é acadêmico, sem fins lucrativos, financiado pelo PPGLEV/UFRJ. Software concebido e desenvolvido por Wisley Vilela, distribuído sob MIT; a licença não concede direitos sobre conteúdo institucional/fotografias.

A hospedagem compartilhada recebe arquivos estáticos por FTP/TLS. Não depende de Node.js, banco, backend, SSH, build ou serviço persistente no servidor. Preserve simplicidade, acessibilidade WCAG 2.1 AA e independência de serviços externos. [AGENTS.md](../AGENTS.md) contém as restrições permanentes.

## 2. Três autoridades distintas

| Local | Responsabilidade e conteúdo |
| --- | --- |
| Git público | Software do site e do Editor, configuração/lockfile, testes, contratos, documentação e exemplos sintéticos. Não contém o conteúdo institucional atual. |
| Editor instalado e sua área local | Aplicação Electron, trabalho recuperado, cache de dependências/build, perfil de conexão, recibos e backups locais. Não é um servidor; instalar nova versão não publica conteúdo. |
| Remoto `/source/` | Projeto institucional editável portátil: conteúdo, código necessário ao site, configuração/lockfile e mídia aceita pelo manifesto. Não é cópia integral do repositório nem local para instalar o Editor. |
| Remoto `/` | Destino fixo do site público estático gerado, relativo à raiz da conta FTP configurada. Não representa necessariamente a raiz física da hospedagem. |

Não use um clone público como substituto do projeto institucional. Sem `content/`, o build do repositório usa `examples/content/` e produz DEMO. O build desktop exclui `public/` e contém somente o Editor. Dados atuais, mídia e materiais editoriais ficam fora do Git; revisões antigas ainda podem conter dados anteriormente rastreados. Não reescreva história sem decisão separada. Consulte a [auditoria de fronteira](REPOSITORY_CONTENT_BOUNDARY.md).

## 3. Camadas e mapa do repositório

```text
Conteúdo estruturado → DataAdapter/JSONAdapter → renderizadores → Vite
                                                                  ↓
                                                           site estático
                                                                  ↓
                                                                FTPS
```

O Editor usa formulários e componentes controlados. Rascunhos são reversíveis até salvar; persistência explícita passa pelos serviços existentes, com escrita/verificação. Não introduza acesso direto a JSON nos renderizadores nem editor livre de HTML/CSS/JavaScript.

| Caminho | Papel |
| --- | --- |
| `src/js/adapters/`, `src/js/sections/`, `src/js/page/` | Adaptadores, renderização e composição da página. |
| `src/js/editor/` e `src/css/editor.css` | Interface, estado, formulários, serviços e prontidão das operações. |
| `desktop/main.cjs`, `desktop/preload.cjs` | Host Electron/IPC. `DesktopHostBridge` separa o renderer da implementação nativa; preserve validações de projeto/caminho e operações restritas. |
| `desktop/source-manifest.cjs` | Lista positiva do projeto portátil e marcadores obrigatórios. |
| `desktop/guided-update.cjs`, `desktop/recovery-store.cjs`, `desktop/remote-cleanup.cjs` | Coordenação, evidência de recuperação e revisão de limpeza. |
| `desktop/portable-build.cjs`, `desktop/portable-vite.config.mjs` | Preparação local e adaptação de build portátil sem alterar a configuração canônica recuperada. |
| `scripts/build-data.js`, `vite.config.js` | Consolidação dos dados e geração estática/desktop. |
| `examples/`, `tests/`, `build/icon.ico` | Exemplos, contratos de teste e ícone do software: materiais necessários, não lixo temporário. |
| `docs/`, `DOCUMENTATION_INDEX.md`, `DEPLOYMENT.md` | Contratos, evidências, navegação e preparação de versões. |

## 4. Manifestos e atualização guiada

O manifesto de fonte é uma lista positiva: JSON canônico, código/configuração do site, scripts de consolidação e mídia admitida. Exclui Editor, documentação, testes, dependências, segredos e saídas geradas. O manifesto público admite somente artefatos estáticos reconhecidos, exige `index.html`/`data.json` e rejeita vazamento do Editor. Não amplie esses limites apenas para acomodar arquivos históricos.

Após recuperação remota, edição e salvamento explícito, **Atualizar site** realiza validação local/conexão, backup/verificação da fonte, atualização/verificação remota, build novo, nova conferência de identidade e backup/publicação/verificação pública. Revisão local é recomendada; teste manual de conexão e build prévio não são requisitos separados do coordenador. Não restaure o antigo fluxo de dois botões.

Recibos vinculam conexão, workspace e fingerprints. O diário em `<userData>/publish/guided-updates/` guarda etapas e IDs de transação, sem senhas. Após interrupção, o coordenador reconcilia diário e transações; reutiliza somente resultados verificados, recupera publicação incompleta primeiro e gera novamente em nova tentativa. Mudança de fonte/build, conflito remoto ou recibo inválido bloqueia confiança no resultado antigo. Fonte atualizada não é revertida automaticamente se o build/publicação falhar.

Referência: [aceitação da atualização guiada](PHASE_7_GUIDED_UPDATE_VERIFICATION.md) e [aceitação real em ambiente descartável](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md). Os relatórios são datados; as pendências de produção/aceitação antigas foram encerradas pelas evidências posteriores.

## 5. Conexão e acesso institucional

O procedimento institucional usa **FTPS explícito**, opção **Usar FTP/TLS** marcada, com verificação normal de certificado. Não é SFTP; não usa SSH. Host, porta, usuário e senha vêm do administrador institucional: não presuma porta padrão ou copie valores de exemplos. Destinos são fixos `/source/` e `/`, não selecionados pelo operador. O checkbox existe na interface; este procedimento exige TLS, sem alegar que toda operação nativa rejeita uma configuração sem TLS.

Não desative validação TLS/certificado para resolver falhas. O suporte deve investigar certificado, rede, acesso e permissões. Obtenha contas por canal institucional seguro, fora do repositório/documentação. Perfil e senha salva são locais; a senha usa armazenamento seguro do Electron. Um arquivo criptografado do computador anterior não substitui provisionamento de acesso para novo mantenedor.

## 6. Backups, recuperação e continuidade

Antes de escrever remotamente, o Editor captura e verifica localmente os arquivos do conjunto de mutação, registrando bytes anteriores, ausência explícita, tamanho e SHA-256. Isso não é um espelho completo da conta. Transações em `<userData>/publish/recovery/transactions/` contêm metadados e payloads separados de fonte/público; mantenha suas referências e cadeias intactas.

**Restaurar site publicado** recupera somente o domínio público e mantém a fonte; **Restaurar projeto editável** recupera somente a fonte e fecha o projeto local para exigir nova recuperação remota. Falha numa tentativa de recuperação de fonte também pode fechar o projeto: investigue antes de reutilizar trabalho local. A cópia é verificada antes de mutação, e a versão afetada atual é protegida. A interface oferece a transação elegível mais recente por domínio, não exploração arbitrária de backups antigos.

Publicação parcial dentro de uma atualização confirmada tenta compensação pública limitada. Se falhar, permanece pendente e deve ser resolvida antes de nova publicação. Não há retry em segundo plano, rollback de fonte automático, atomicidade FTP nem bloqueio entre mantenedores. Combine janela exclusiva; o público pode ficar parcial até a recuperação funcionar.

Retenção normal conserva as cinco transações plenamente bem-sucedidas mais recentes; registros falhos, interrompidos, danificados e cadeias referenciadas são preservados mesmo além desse limite. Falta de espaço/captura bloqueia escrita. Não apague registros para contornar falhas. Contrato: [backup e recuperação](BACKUP_RECOVERY_CONTRACT.md).

O caminho real é resolvido por `app.getPath("userData")`; no Windows normalmente é `%APPDATA%/lab-fon-ufrj`. Em mudança de máquina, inventarie trabalho, backups, diários e recibos sob custódia privada; valide integridade/referências e acesso independente. Não presuma que copiar um perfil ou resumo reconstitui recuperação operacional.

## 7. Preparar uma máquina de desenvolvimento/manutenção

1. Obtenha o repositório pela URL oficial acima, selecione `v1.1.0` para reproduzir a release e preserve trabalho existente. Não presuma que futuros commits de `main` são equivalentes à versão instalada; use tags/commits explícitos.
2. Prepare Windows para Electron/empacotamento e Node.js/npm no PATH. O lockfile do checkpoint requer Node.js **22.12 ou superior** para o conjunto de ferramentas; a máquina usada nesta documentação tem Node.js **22.16.0**, npm **10.9.2**. Isso registra contexto, não aceitação completa de uma nova máquina.
3. Em clone limpo, execute `npm ci`; para o site, use `npx vite --host 127.0.0.1` / `npm run build`; para o Editor, `npm run editor:dev`. Não publique o DEMO de um clone sem conteúdo institucional. O primeiro lançamento de desenvolvimento pode baixar o binário Electron do GitHub: acesso ao registry npm sozinho não garante esse download.
4. Verifique com `npm test -- --run` e os builds relevantes na fase de verificação autorizada. Os seis failures de baseline já registrados precisam ser distinguidos de regressões; não declare suíte totalmente verde nem ajuste testes para esconder falhas. Evite upgrades/`npm audit fix` não aprovados.
5. Para manutenção institucional, provisione acesso FTPS separadamente, abra o projeto remoto pelo Editor e confirme validação. O projeto recuperado precisa de suas próprias dependências: o host executa `npm ci` quando Vite local está ausente, seguido do build. Precisa de internet/registry, espaço e Node.js/npm acessíveis; o instalador não inclui o toolchain completo.

Não copie conteúdo privado para o clone público para “corrigir” o build. Mantenha workspace institucional separado. O host usa wrapper local em `node_modules/.labfon-build/`, gera em `dist/` e valida a saída pública, preservando a configuração canônica. Leia o [registro da correção de build portátil](MANUAL_ACCEPTANCE_BUILD_REPAIR.md) como evidência histórica; suas instruções de sessão não são um pré-requisito atual.

O hostname FTPS fornecido pelo administrador deve corresponder ao certificado do servidor. Se a conexão falhar por incompatibilidade de nome, peça o hostname correto ou a correção do certificado; não desative a verificação nem substitua FTPS por FTP sem TLS.

O desenvolvimento do Editor usa a porta local **3000**, fixa no host. Antes de `npm run editor:dev`, confirme que não há outro servidor nessa porta; o script atual pode deslocar Vite para outra porta sem deslocar o host, carregando um renderer de outra sessão. Não use essa combinação. Feche apenas processos próprios ou utilize a alternativa sem servidor de desenvolvimento:

```powershell
$env:ELECTRON_RUN_AS_NODE = $null
npm run build:editor-renderer
npx electron .
```

Essa alternativa gera somente o renderer e abre o host local, sem empacotar. Ela substitui o `dist/` do clone por saída do Editor; `npm run build` gera novamente a saída pública. O projeto institucional recuperado possui seu próprio `dist/`. Se precisar de outra porta para o desenvolvimento do site, use `npx vite --host 127.0.0.1 --port <porta-livre> --strictPort`.

Nesta baseline com findings de dependências, restrinja servidores de desenvolvimento a loopback e projetos confiáveis. Use testes em execução única; não execute `test:ui`/Browser Mode no Windows sem tratar o advisory aplicável. Essas restrições não equivalem a auditoria de segurança completa; consulte a [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md) para a classificação e a aprovação cumulativa da Fase 3.

## 8. Manter o projeto de produção e preparar versões

O mantenedor de conteúdo recupera o projeto atual, edita/salva, revisa e confirma atualização conforme o guia. O técnico prepara ambiente e suporte; mudanças de software/site canônico devem ser conciliadas explicitamente com o conteúdo institucional antes de atualizar. Não substitua `/source/` por um clone ou inicialize uma conta já populada. Uma sessão local não publica; o fluxo cotidiano exige projeto remoto recuperado.

Para recuperar falha, preserve conexão/revisão, mensagens e registros privados antes de decidir retry ou restauração. O relatório descartável comprova falha pública/retry, interrupção/reconciliação, recuperação dos dois domínios e nova recuperação/geração após restaurar fonte. Esses testes não autorizam repetição em produção.

Preparação de versões futuras segue [DEPLOYMENT.md](../DEPLOYMENT.md): fonte/lockfile verificados, builds, aceitação instalada e portátil, revisão de fronteira/privacy, integração/tag/release explicitamente autorizados. `npm run editor:build` produz NSIS x64 por usuário e `win-unpacked`; empacote a árvore completa em ZIP portátil e publique os hashes dos artefatos efetivamente testados. A release v1.1.0 contém instalador/ZIP/checksums/notas; binários ficam na release, não no Git. Instalador sem assinatura exige comunicação neutra, jamais desativar proteção do Windows.

Atualizar o Editor não altera o site nem substitui o projeto institucional. Código novo do site precisa ser conciliado com `/source/` e conteúdo real antes de uma publicação institucional autorizada; o build DEMO nunca é candidato institucional. O menu de ajuda aponta para o guia em `main` e a última release publicada. Este fechamento mudou apenas documentação em relação aos artefatos aceitos; não criou necessidade de nova publicação ou limpeza em produção.

## 9. Estado aceito e limitações

A [convergência de 2026-10-03](PRODUCTION_CONVERGENCE_2026-10-03.md) verificou 216 arquivos de fonte e 104 públicos; recuperação independente trouxe 221 arquivos portáteis, incluindo cinco imagens históricas preservadas. Builds e conferências desktop/mobile passaram. Não se trata de uma nova release instalada nem de uma verificação ao vivo realizada nesta fase documental.

Há arquivos legados fora dos manifestos. Revisão atual classificou 26 candidatos (424.149 bytes), sem excluir nenhum. Limpeza continua hard-disabled, sem controle de execução no renderer; sua classificação não é autorização. Preserve arquivos desconhecidos/mídia/metadados da hospedagem. [Contrato de limpeza](PHASE_8_CLEANUP_VERIFICATION.md) registra mecanismos e condições futuras; propostas antigas não são autorização atual.

Outros limites: dependências antigas e avisos/audit pendentes não foram corrigidos; a [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md) classifica os seis failures conhecidos e a exposição das dependências, sem declarar suíte verde ou clearance geral; primeiro build requer registry e toolchain externo; serviços externos como Instagram podem emitir diagnósticos ou ficar indisponíveis; FTP não é transacional; backups de operação não substituem arquivo integral; revisão de mídia/história/cópias locais exige decisão específica.

## 10. Responsabilidades e custódia pendente

| Responsável pendente de designação institucional | Entrega/responsabilidade |
| --- | --- |
| Mantenedor editorial | Autorização sobre conteúdo/imagens, salvamentos/revisão, janela coordenada e conferência pública. |
| Técnico de software/operações | Ambiente, validação/regressões, conciliação software/dados, suporte a falhas e releases aprovadas. |
| Administrador de acesso/hospedagem | Conta/permissões/certificados e acesso seguro independente, sem credenciais em documentos. |
| Custodiante de dados/recuperação | Destino privado durável, payloads/manifests/journals íntegros, recibo e ensaio isolado quando autorizado. |
| Mantenedor independente de aceitação | Acesso próprio, recebimento do arquivo privado e conferência do fluxo documentado em ambiente apropriado. |
| Aprovador formal de releases | Autoridade institucional sobre versão/distribuição e aceite de entrega; autorização técnica desta Fase 5 foi dada pelo usuário, sem nomear ocupante permanente dessa função. |

O [inventário de entrega](DELIVERY_INVENTORY.md) define ORIGINAL-INSTITUTIONAL-CONTENT, PRODUCTION-CONVERGENCE-2026-10-03, DISPOSABLE-ACCEPTANCE-POST-V1, HISTORIC-V1-RELEASE e SCREENSHOT-ORIGINALS. Acrescentam-se o exercício isolado de continuidade e a evidência privada de aceitação do pacote 1.1.0. Os mapas privados acompanham os arquivos fora do Git; referências temporárias são localizadores de origem, não o arquivo institucional durável. Custodiante e destino restrito durável ainda precisam ser acordados. Transferir payloads com manifestos/journals/recibos associados, conferir contagens/SHA-256/legibilidade/referências e obter recibo; repetir leitura/restauração somente em destino isolado autorizado. Nenhuma origem deve ser apagada antes dessa conferência. Este handover não é recibo de transferência. A pendência administrativa não impede entrega técnica, mas deve ser resolvida antes de o sucessor depender exclusivamente do arquivo transferido.

Preserve a cópia antiga com trabalho do usuário, backups e evidências únicas. Só considere caches/builds/diagnósticos repetitivos removíveis depois de verificar que não contêm material único e arquivar o necessário. A higiene posterior à release acrescentou `docs/disposable_ftp_connection.md` ao `.gitignore` compartilhado; não force sua inclusão nem copie dados de acesso para documentos públicos. O [fechamento de higiene](FINAL_CLOSURE_ASSESSMENT.md) registra as decisões de branches, evidências preservadas e pendências institucionais.

Os guias descrevem operações, mas não concedem acesso/autorizações de produção. O novo mantenedor precisa de software validado, acesso provisionado pelo administrador, projeto institucional recuperável, acesso ao arquivo privado e política de manutenção exclusiva. Nomes de responsáveis e recibo de custódia permanecem pendentes, sem atribuir essas funções ao autor por inferência. A licença e o suporte não dependem da disponibilidade do desenvolvedor original.

## 11. Navegação e próxima verificação

Comece pelo [índice](../DOCUMENTATION_INDEX.md), guia e inventário. Contratos de composição/linhas continuam referências; o [contrato C0](CUSTOM_SECTION_CONTRACT.md) é proposta histórica, com implementação C2 aceita em relatório separado. Relatórios de sessões preservam contexto, não substituem este estado/convergência atual.

A [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md) aprova a Fase 3 por setup/recuperação institucional/build/prévia novos e aceitação cumulativa de manutenção/recuperação. A [aceitação de Fase 4](RELEASE_CANDIDATE_1.1.0.md) cobre instalação, upgrade, portátil, Sobre/links e privacidade; a Fase 5 integra e publica v1.1.0 sem alterar essas entradas de build. A conta descartável não é pré-requisito de manutenção. A conferência documental final cobre instalação/toolchain, recuperação remota, salvar/gerar/revisar/atualizar, retry/recuperação e preparação de versão; não identificou blocker técnico adicional. Não se repetiram testes destrutivos, migração ou publicação de produção para esta entrega. Designação de papéis/arquivo durável/recibo de transferência permanecem providências institucionais posteriores, sem iniciar nova fase de desenvolvimento.

## 12. Estimativa de esforço de desenvolvimento

Estimativa de **290–515 horas-pessoa de esforço de engenharia**, confiança baixa a moderada. Método por pacotes de trabalho, com faixas mínima/máxima baseadas em escopo implementado e evidências: histórico Git desde 11/10/2025, 89 commits até `e2b02ad`, relatórios de baseline/C2, contratos de atualização/recuperação, convergência e aceitações das Fases 1–4. Commits demonstram trabalho, não horas; não foram multiplicados por uma duração fixa.

| Pacote evidenciado | Horas-pessoa estimadas |
| --- | --- |
| Requisitos, arquitetura estática/adaptadores e base de dados | 40–70 |
| Site, renderização, responsividade, acessibilidade e integrações | 35–65 |
| Editor desktop, formulários, mídia, composição/seções controladas | 70–120 |
| Recuperação remota, geração portátil, FTPS, atualização guiada e recuperação/reconciliação | 75–130 |
| Testes, diagnóstico, aceitação nativa/produção, empacotamento e integridade | 45–80 |
| Documentação, continuidade, fronteira de conteúdo e handoff/release | 25–50 |
| **Total** | **290–515** |

É uma faixa fundamentada de esforço necessário ao escopo entregue, não timesheet reconstruído, total faturado ou medição das horas humanas realmente registradas. Não confundir com duração de calendário ou execução dos agentes de IA. Trabalho anterior/externo ao Git, pesquisa e autoria do conteúdo institucional, gestão contínua, hospedagem e transferência futura do arquivo privado não são quantificados aqui. Registros Clockify/planilhas não foram conciliados com esse escopo; se a instituição os fornecer e validar, devem substituir/refinar a estimativa, sem converter datas de commits em jornadas.
