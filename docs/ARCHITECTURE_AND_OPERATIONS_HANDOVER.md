# Arquitetura e operações — rascunho de handover técnico

Referência do estado pós-v1 aceito em 2026-10-03, software `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7`, branch `work/post-v1.0-hardening-2026-10-02`. Este rascunho não confirma entrega de arquivos privados, nova versão instalada ou transferência de credenciais. Operação cotidiana: [guia do usuário](GUIA-DO-USUARIO.md).

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

1. Obtenha o repositório pela organização/URL indicada no [README](../README.md), selecione a revisão aceita e preserve trabalho existente. Para reproduzir este checkpoint, use o commit completo informado no início; não presuma que `main` ou a versão publicada já contém o pós-v1.
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

Preparação de versão segue [DEPLOYMENT.md](../DEPLOYMENT.md): fonte/lockfile verificados, builds, aceitação instalada e portátil, revisão de fronteira/privacy, integração/tag/release explicitamente autorizados. `npm run editor:build` produz NSIS x64 por usuário e `win-unpacked`; ZIP portátil é artefato de distribuição, não um alvo adicional presumido. A release v1.0.0 contém instalador e ZIP portátil; binários ficam na release, não no Git. Instalador sem assinatura exige comunicação neutra, jamais desativar proteção do Windows.

Nesta fase não se alteram processo, versão, licença ou release. O menu de ajuda aponta para `main` e a última release, que podem anteceder este checkpoint. Uma versão só deve ser anunciada depois da integração/distribuição aprovada.

## 9. Estado aceito e limitações

A [convergência de 2026-10-03](PRODUCTION_CONVERGENCE_2026-10-03.md) verificou 216 arquivos de fonte e 104 públicos; recuperação independente trouxe 221 arquivos portáteis, incluindo cinco imagens históricas preservadas. Builds e conferências desktop/mobile passaram. Não se trata de uma nova release instalada nem de uma verificação ao vivo realizada nesta fase documental.

Há arquivos legados fora dos manifestos. Revisão atual classificou 26 candidatos (424.149 bytes), sem excluir nenhum. Limpeza continua hard-disabled, sem controle de execução no renderer; sua classificação não é autorização. Preserve arquivos desconhecidos/mídia/metadados da hospedagem. [Contrato de limpeza](PHASE_8_CLEANUP_VERIFICATION.md) registra mecanismos e condições futuras; propostas antigas não são autorização atual.

Outros limites: dependências antigas e avisos/audit pendentes não foram corrigidos; a [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md) classifica os seis failures conhecidos e a exposição das dependências, sem declarar suíte verde ou clearance geral; primeiro build requer registry e toolchain externo; serviços externos como Instagram podem emitir diagnósticos ou ficar indisponíveis; FTP não é transacional; backups de operação não substituem arquivo integral; revisão de mídia/história/cópias locais exige decisão específica.

## 10. Responsabilidades e custódia pendente

| Responsável a designar institucionalmente | Entrega/responsabilidade |
| --- | --- |
| Mantenedor editorial | Autorização sobre conteúdo/imagens, salvamentos/revisão, janela coordenada e conferência pública. |
| Técnico de software/operações | Ambiente, validação/regressões, conciliação software/dados, suporte a falhas e releases aprovadas. |
| Administrador de acesso/hospedagem | Conta/permissões/certificados e acesso seguro independente, sem credenciais em documentos. |
| Custodiante de dados/recuperação | Destino privado durável, payloads/manifests/journals íntegros, recibo e ensaio isolado quando autorizado. |

O [inventário de entrega](DELIVERY_INVENTORY.md) define ORIGINAL-INSTITUTIONAL-CONTENT, PRODUCTION-CONVERGENCE-2026-10-03, DISPOSABLE-ACCEPTANCE-POST-V1, HISTORIC-V1-RELEASE e SCREENSHOT-ORIGINALS. O mapa privado acompanha os arquivos, fora do Git. Custodiante e destino durável ainda precisam ser acordados. Confirmar recebimento, contagens/checksums, legibilidade e referências é condição para limpeza futura e handoff final; este rascunho não é recibo.

Preserve a cópia antiga com trabalho do usuário, backups e evidências únicas. Só considere caches/builds/diagnósticos repetitivos removíveis depois de verificar que não contêm material único e arquivar o necessário. A proteção do documento local de conexão é hoje uma exclusão local, não política compartilhada; a fase de higiene deverá tratar o risco sem expor seu conteúdo.

Os guias descrevem operações, mas não concedem acesso/autorizações de produção. O novo mantenedor precisa de software validado, acesso provisionado, projeto institucional recuperável, custódia confirmada e uma política de manutenção exclusiva. Pendências de custódia e lançamento ficam explícitas até serem aceitas nas fases seguintes.

## 11. Navegação e próxima verificação

Comece pelo [índice](../DOCUMENTATION_INDEX.md), guia e inventário. Contratos de composição/linhas continuam referências; o [contrato C0](CUSTOM_SECTION_CONTRACT.md) é proposta histórica, com implementação C2 aceita em relatório separado. Relatórios de sessões preservam contexto, não substituem este estado/convergência atual.

A [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md) aprova a Fase 3 por setup, recuperação institucional e build/prévia novos, somados à aceitação anterior de manutenção/recuperação e à convergência/backup de produção. A condição DNS/TLS do destino descartável limita apenas repetição: esse servidor não integra a arquitetura nem os pré-requisitos de entrega. Fase 4 autorizada para preparação, começando pela revisão do checkpoint software/documentação indicada no audit; não foi iniciada nesta reavaliação. Custódia, aceite de distribuição instalada/portátil, integração/release e eventual limpeza continuam gates próprios.
