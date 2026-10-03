# Auditoria de continuidade e reproducibilidade — 2026-10-03

**Fase 3: aprovada por evidência cumulativa.** A reavaliação autorizada no `next.md` considera em conjunto a aceitação destrutiva anterior, a convergência de produção, backups/recibos verificados e o setup/recuperação/build/prévia reproduzidos no ambiente novo. Não foi identificada evidência única faltante ou defeito de continuidade não resolvido. O problema DNS/TLS do servidor descartável é limitação externa de repetição, não requisito permanente do produto.

**Fase 4: preparação autorizada pelo gate, não executada neste passe.** A aprovação anterior ficou pendente enquanto o critério exigia repetir manutenção no destino novo; esta decisão substitui aquele gate sem alegar que a repetição ocorreu. TLS estrito permanece obrigatório. Nenhuma escrita em produção, alteração de aplicativo/dependências/versão, empacotamento, tag, release, merge, reescrita de histórico ou limpeza ocorreu nesta reavaliação.

## Ambiente e método

- Clone novo do GitHub, branch `work/post-v1.0-hardening-2026-10-02`, commit `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7`. Os documentos aceitos das Fases 1–2, ainda não commitados, foram sobrepostos como snapshot documental explícito; não se afirma que já estão em `main`.
- Windows 11 Home Single Language, versão/build `10.0.26200`, x64; Node.js `22.16.0`, npm `10.9.2`, Electron `44.0.0`, Vite `7.1.9`, Vitest `3.2.4`. Node ≥22.12 é o requisito do conjunto de ferramentas; somente a combinação acima foi exercitada, não todas as versões superiores.
- Isolamento equivalente de aplicação: caches npm/Electron novos, configurações npm vazias, diretórios temporários/APPDATA/LOCALAPPDATA próprios e áreas de usuário distintas para institucional/descartável. Não é uma nova conta Windows nem máquina/VM recém-instalada.
- Nenhum `content/`, workspace, dependência ou recuperação da máquina de desenvolvimento foi copiado ao clone. Binário Electron foi baixado/verificado no cache do próprio audit; uma tentativa inicial do driver de acessar o executável antes do download foi corrigida, sem mudança no aplicativo.
- Entradas externas obrigatórias: toolchain documentado, internet/registry/GitHub e credenciais institucionais autorizadas. O acesso institucional existente foi provisionado em memória a partir do armazenamento protegido; não se copiou perfil ou senha ao ambiente receptor. Um sucessor deve obter os dados da conta pelo administrador, não depender desse mecanismo local de provisionamento. O arquivo autorizado do destino descartável permaneceu fora do Git.

## Resultados reproduzidos

| Exercício | Resultado e limite |
| --- | --- |
| Instalação | `npm ci` passou, instalando 473 pacotes a partir do lockfile com cache npm próprio. |
| Site software-only | `npm run build` passou com exemplos públicos, sem conteúdo institucional. Servidor Vite novo em loopback/porta livre respondeu HTTP 200. DEMO não foi enviado ao servidor. |
| Renderer/host | `npm run build:editor-renderer` passou, sem empacotar. Host nativo carregou o renderer `file:` do clone novo; as seis abas e bridge reais ficaram disponíveis. |
| Desenvolvimento na porta padrão | Porta 3000 já ocupada por sessão anterior. O host fixa 3000 enquanto o script pode deslocar Vite: não foi usado o renderer antigo para comprovar startup. A alternativa documentada de renderer local remove essa dependência e foi exercitada com isolamento/guarda do audit. |
| Estado inicial institucional | Perfil salvo, workspace e recuperação ausentes antes de fornecer acesso. Conexão FTPS e recuperação remota válida passaram. |
| Build/preview institucional | Preparação automática do workspace, geração e prévia locais passaram; iframe visível, destino atual e resposta HTTP 200 com página gerada. Nenhum arquivo institucional foi colocado no Git. |
| UI com exemplos independentes | Parcerias habilitada mostrou picker de logo disponível. Fonte-only antiga permaneceu escondida; atualização remota ficou bloqueada em sessão local, conforme o contrato. |
| Destino descartável | Perfil/workspace/recuperação inicialmente vazios. Conexão com TLS exigido falhou com `FTP_TLS_FAILED`, antes de recuperar, editar ou escrever remotamente. Após o usuário confirmar o mesmo arquivo de acesso, rechecagem confirmou certificado incompatível com o hostname (`ERR_TLS_CERT_ALTNAME_INVALID`). Não foi identificado hostname alternativo do certificado resolvendo para o mesmo endpoint. |
| Editar/salvar, gerar/revisar, Atualizar site, retry e recuperações no destino novo | Não repetidos devido à condição externa DNS/TLS. Aceitação anterior e convergência cobrem os contratos; a reavaliação não exige duplicação no servidor temporário. Nenhuma falha foi injetada em produção. |
| Interrupção/reconciliação e revisão sem exclusão | Contratos e navegação conferidos na documentação/código; [aceitação descartável anterior](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md) continua válida como evidência anterior, não como conclusão desta execução independente. Não foram repetidas falhas por volume. |

O acesso institucional foi somente leitura, com cliente do audit impedindo operações de escrita/removal/rename. Build e revisão foram locais. As dificuldades de timing/origem do driver de automação foram corrigidas somente nos helpers privados; não demonstraram defeito no Editor.

### Condição externa do endpoint descartável

No passe específico de desbloqueio, a configuração fornecida usa um endereço IP na porta 21. O certificado apresentado cobre `*.hostgator.com.br` e `hostgator.com.br`, sem entrada IP correspondente; a conexão com validação estrita retorna `ERR_TLS_CERT_ALTNAME_INVALID`. O certificado observado indica emissor Sectigo e validade de 29/05/2026 a 13/12/2026; isso não substitui validação completa de cadeia/nome num endpoint correto.

O DNS do domínio literal do certificado não aponta para o endpoint configurado. O reverso do IP retorna um nome fora dos nomes cobertos, sem resolução direta obtida; o greeting FTP não anuncia hostname. O wildcard não identifica qual servidor atende à conta descartável. Portanto, certificado/DNS/banner não estabeleceram um hostname alternativo inequívoco; não foram tentados nomes arbitrários, credenciais em destinos presumidos ou contornos de validação.

**Somente se uma futura repetição for necessária:** o administrador deve fornecer o hostname FTPS dessa mesma conta isolada, confirmado no painel/provedor, que apresente certificado válido para esse nome na porta 21 com TLS explícito. Se o hostname pretendido não estiver coberto, corrigir/substituir o certificado para cobri-lo. Manter dados de acesso fora de chat/Git. A [orientação oficial de dados FTP da HostGator](https://suporte.hostgator.com.br/hc/pt-br/articles/30811387611795-Quais-s%C3%A3o-os-dados-de-acesso-do-FTP-na-HostGator) identifica o nome do servidor como entrada de conexão, mas não identifica publicamente o servidor desta conta. Corrigir ou conservar esse ambiente temporário não é condição de entrega.

Diagnóstico bruto de certificado/DNS/greeting permanece privado. Nenhuma mutação remota ocorreu neste ambiente novo. A aceitação anterior permanece intacta: não se declara aceitação destrutiva nova ou validação FTPS de todos os cenários históricos. A conexão institucional FTPS estrita foi reproduzida separadamente. As classificações dos seis testes e das dependências não mudaram; a decisão cumulativa está abaixo.

Após atualização do arquivo privado pelo usuário, dois retries usaram o novo hostname com TLS estrito configurado. Ambos terminaram por timeout na conexão, antes de negociar TLS ou autenticar. O DNS atual retorna endereços de proxy Cloudflare, diferentes do endpoint original; isso indica encaminhamento incompatível com FTP comum, não uma nova falha de certificado demonstrada. A [documentação oficial Cloudflare](https://developers.cloudflare.com/dns/proxy-status/use-cases/) exige DNS-only para FTP no proxy padrão. O administrador deve confirmar o nome direto do servidor ou corrigir apenas o registro FTP para apontar diretamente ao servidor, mantendo também um certificado válido para o hostname utilizado. Nenhuma alteração de DNS foi feita pelo audit. O helper de aceitação anterior selecionava FTP/FTPS por notas opcionais do arquivo de acesso; seu sucesso não comprova validação FTPS estrita. Os dados de conta/endereço continuam somente na evidência privada.

## Seis failures de baseline

Reproduzidos nos três arquivos focados: **92 passaram / 6 falharam / 98 testes**. Não houve alteração/remoção/enfraquecimento de testes ou código.

| Grupo | Causa observada e classificação |
| --- | --- |
| Quatro em `editor-photo-integration.test.js` | Fixture de Parcerias habilita somente Equipe e espera um picker de área filtrada. A UI atual oferece somente áreas habilitadas; a sessão real de exemplos com Parcerias habilitada apresentou o picker. Dívida de fixture/assertions, não blocker demonstrado do fluxo suportado. |
| Um em `custom-sections.test.js` | A composição habilita Sobre/custom e o teste espera todas as áreas built-in. Incompatível com filtro aceito por composição. Dívida de assertion, não blocker de continuidade demonstrado. |
| Um em `editor-initialization.test.js` | Espera habilitar o antigo botão fonte-only, deliberadamente escondido/desabilitado após o fluxo guiado. Assertion histórica, não defeito da ação Atualizar site. |

Essas seis falhas são explicitamente classificadas como não bloqueantes para o contrato suportado, mantendo visível a suíte não verde. O restante da suíte não foi repetido: nenhuma correção de código/configuração foi feita. Não se declara release testada ou plenamente verde.

## Dependências: aceitação limitada, não clearance geral

`npm audit` do clone registrou **30 findings: 6 moderate, 22 high, 2 critical**; `npm audit --omit=dev` registrou **zero** no conjunto de dependências de produção. Contagens variam com o banco de advisories; zero nessa consulta não audita o binário Electron ou torna todo o build seguro.

Os findings alcançam ferramentas de teste/dev/build/empacotamento, inclusive Vite, Vitest UI, Rollup/PostCSS, parsers/globs e dependências de builder/test-server. Foram classificados como não bloqueantes **para a operação qualificada de site estático/Editor com entradas confiáveis e ferramentas restritas**, mantendo dívida de manutenção; não são aceitos para serviços expostos ou processamento de projetos/arquivos não confiáveis.

- Não usar Vitest UI/Browser Mode no Windows nessa baseline: o [advisory do Vitest](https://github.com/advisories/GHSA-5xrq-8626-4rwp) aplica-se quando o serviço UI está em execução. Testes desta auditoria usaram execução única.
- Vite somente em loopback e projetos confiáveis; o [advisory de bypass no Windows](https://github.com/advisories/GHSA-93m4-6634-74q7) impede tratar `fs.deny` como solução suficiente para exposição de rede. O Editor instalado usa renderer local e prévia nativa, não serviço Vite público.
- Código/configuração/CSS e inputs de build devem vir das fontes institucionais/repos verificados; o [advisory do Rollup](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) e os findings PostCSS/parsers não justificam aceitar projetos arbitrários. Sem upgrade amplo ou `audit fix` nesta fase.

Esta classificação é análise de exposição do fluxo atual, não exploração exaustiva de todos os advisories. O responsável técnico deve preservar/revisar os resultados brutos privados antes da preparação de release e tratar qualquer mudança de exposição como novo gate.

## Evidência cumulativa e decisão do gate

| Critério de continuidade | Evidência suficiente e limite |
| --- | --- |
| Setup independente | Clone/caches/perfil próprios, instalação do lockfile, build software-only e renderer/host reais descritos acima. Credenciais são entrada institucional externa documentada; não há requisito de perfil, workspace ou mecanismo de provisionamento do desenvolvedor original. |
| Recuperação/build/prévia institucional | Conexão FTPS estrita, abertura válida, geração e prévia passaram no ambiente novo. A [convergência aceita](PRODUCTION_CONVERGENCE_2026-10-03.md) também registra recuperação independente e correspondência dos 216 arquivos de fonte/104 públicos. |
| Edição/salvamento e atualização ordinária | [Aceitação descartável](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md) com descrições B/C salvas e coordenador real; convergência institucional posterior protegeu, atualizou e verificou fonte/público. |
| Falha/retry e interrupção/reconciliação | Aceitação anterior e seus recibos: retry concluiu com o mesmo recibo de fonte; restart reconciliou a interrupção e retomou recuperação/build/publicação sem repetir atualização da fonte. |
| Recuperação pública e de fonte | UI nativa anterior comprovou público C/B preservando fonte, depois fonte B/B preservando público, fechamento do projeto e nova recuperação/geração. Backups/recibos de produção dos dois domínios tiveram sucesso e payloads verificados; isso não é ensaio de restauração em produção. |
| Revisão somente leitura | Inventários/hashes anteriores iguais antes/depois, sem controle de exclusão; convergência também confirmou revisão atual sem mutação e preservação dos arquivos fora dos manifestos. |
| Instruções suficientes | [Guia](GUIA-DO-USUARIO.md), [handover](ARCHITECTURE_AND_OPERATIONS_HANDOVER.md) e deployment explicam setup/toolchain, TLS, revisão/atualização, retry, retorno após recuperação de fonte, cópias locais e custódia. A conta descartável não integra a arquitetura entregue nem os pré-requisitos do mantenedor. |
| Findings e lacunas | Seis assertions/fixtures obsoletas e dependências permanecem não bloqueantes nas restrições registradas. Nenhuma lacuna única de aceitação ou defeito concreto de produto/continuidade foi identificado; indisponibilidade do teste temporário impede apenas repetição redundante. |

Foram conferidos os resultados privados já existentes de falha/retry, interrupção, UI/recuperação/limpeza, estado inicial/resultado institucional novo e verificação final dos backups de produção, sem acessar novamente os servidores ou duplicar testes destrutivos. Relatórios originais não foram reescritos. A evidência histórica de transporte FTP não é apresentada como aceitação FTPS estrita: o transporte seguro institucional é comprovado pelo exercício independente, enquanto os contratos de manutenção/recuperação usam a aceitação cumulativa autorizada.

**Decisão:** Fase 3 aprovada; a condição externa descartável é não bloqueante. Não há requisito de restaurar aquele servidor para entrega. A aprovação estabelece prontidão para preparação de release, não aceitação de instalador/portátil novos nem autorização de escrita/limpeza em produção.

## Correções documentais e início da Fase 4

README, handover e deployment esclarecem download inicial de Electron, requisito da porta 3000, alternativa sem servidor/empacotamento, separação dos dois `dist/` e restrições de dev/test. O aplicativo, lockfile, metadados de versão e processo de release não foram alterados.

Nesta reavaliação, audit/handover/deployment/índice distinguem resultados novos, aceitação anterior, convergência e limitação externa; removem a exigência de manter ou reparar o servidor temporário como gate de entrega. Guia e requisito FTPS institucional continuam válidos, sem mudança. Não foram repetidos testes/builds: nenhuma alteração de código/configuração foi feita.

**Ponto exato de início autorizado da Fase 4:** revisar/fixar o checkpoint de entrada para preparação de release: software `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7` mais o snapshot documental aceito das Fases 1–3, ainda não commitado. Conferir a fronteira software/conteúdo privado e planejar os artefatos/checks de instalador/portátil conforme [DEPLOYMENT.md](../DEPLOYMENT.md), mantendo as restrições de dependências e a custódia do [inventário](DELIVERY_INVENTORY.md). Custodiante/destino durável, aceite instalado/portátil e autorizações de integração/versão/distribuição continuam gates explícitos da preparação/entrega; não foram executados ou presumidos aqui.

Este passe para na decisão do gate. Evidências brutas, projetos, inputs de acesso e payloads permanecem privados e preservados. Nenhuma operação de Fase 4, empacotamento, tag/release/merge ou alteração de produção foi realizada.
