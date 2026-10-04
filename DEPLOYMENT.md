# Publicação e empacotamento

Este documento orienta desenvolvedores e responsáveis pela preparação de versões. Para manutenção comum do conteúdo, consulte o [Guia do Usuário do Editor Labfonac](docs/GUIA-DO-USUARIO.md).

O [handover técnico final](docs/ARCHITECTURE_AND_OPERATIONS_HANDOVER.md) descreve ambiente, manifestos, recuperação e custódia. A [release v1.1.0](https://github.com/Wisleyv/lab-fon-ufrj/releases/tag/v1.1.0) distribui o fluxo aceito; v1.0.0 é histórica. Futuras integrações/publicações de versão requerem autorização própria.

## Modelo vigente

O site de produção é estático. O Editor Labfonac mantém uma cópia local de trabalho, salva o conteúdo, gera os arquivos do site e publica pelo acesso FTP configurado no próprio aplicativo.

Os caminhos remotos do projeto editável e do site publicado são controlados pelo Editor. Não devem ser escolhidos manualmente pelo mantenedor.

Não há backend, banco de dados ou processo de build no servidor. Também não há publicação automática a partir de `main`: uma alteração no GitHub não substitui a revisão e a publicação explícita pelo Editor.

## Verificação do código-fonte

Em uma cópia limpa do repositório:

Prepare Node.js/npm no PATH (Node.js 22.12 ou superior para o lockfile do checkpoint). O Editor invoca o npm da máquina e prepara dependências do workspace recuperado quando necessário; o instalador não inclui o toolchain completo.

Em desenvolvimento, o primeiro lançamento pode baixar Electron do GitHub. Para startup, conflito da porta 3000 e alternativa sem empacotamento, siga o [handover](docs/ARCHITECTURE_AND_OPERATIONS_HANDOVER.md). O [registro de continuidade](docs/CONTINUITY_REPRODUCIBILITY_AUDIT.md) aprova a Fase 3 por evidência cumulativa, distingue findings não bloqueantes sob restrições e classifica a condição do servidor descartável como limitação externa de repetição. Essa conta temporária não é pré-requisito de manutenção ou entrega.

```powershell
npm ci
npm test -- --run
npm run build
```

O comando `npm run build` gera o site estático em `dist/`. Esse diretório é gerado e ignorado pelo Git.

Sem `content/`, o clone usa exemplos e gera DEMO, nunca candidato institucional para publicação. Verifique separadamente o projeto institucional privado. A [baseline de conteúdo](docs/REPOSITORY_CONTENT_BOUNDARY.md) registra seis failures conhecidos: resultados futuros devem distinguir baseline e regressões, sem presumir suíte verde.

## Aplicativo Windows

A release 1.1.0 e suas entradas/notas/aceitação estão no [registro de preparação e publicação](docs/RELEASE_CANDIDATE_1.1.0.md). Os nomes históricos de instalador/executável são preservados para upgrade; a versão do aplicativo vem de `package.json`.

Para gerar os artefatos do Editor:

```powershell
npm ci
npm run editor:build
```

O Electron Builder produz em `release/`:

- instalador NSIS x64 por usuário;
- distribuição Windows não instalada (`win-unpacked`).

O diretório `release/` é ignorado pelo Git. Não registre instaladores, executáveis ou demais binários gerados no repositório.

Antes de distribuir uma versão, verifique em uma cópia limpa:

1. instalação sem privilégio administrativo desnecessário;
2. abertura pelo menu Iniciar;
3. identidade visual e abas do Editor;
4. presença da entrada de desinstalação;
5. desinstalação completa;
6. abertura da distribuição portátil.

O instalador `v1.1.0` não possui assinatura digital. O Windows pode indicar fornecedor desconhecido ou exibir um aviso de reputação. Isso deve ser comunicado com neutralidade; não desative nem oriente o usuário a desativar proteções do sistema.

## Publicação do site

O fluxo operacional aceito é executado no Editor:

1. abrir o projeto remoto;
2. editar e salvar o conteúdo e a página;
3. revisar com **Gerar site** e **Prévia do site gerado**;
4. confirmar **Atualizar site**, que verifica conexão/projeto, protege e atualiza a fonte, gera novamente e protege/publica o site;
5. aguardar sucesso e verificar manualmente o site público.

Salvar não publica. Revisão prévia é recomendada; build anterior e teste manual separado de conexão não são requisitos técnicos do coordenador. Falha de build não reverte a fonte já atualizada. Publicação parcial tenta recuperação pública limitada; recuperação pendente precede nova tentativa. Recuperação de fonte é explícita, não muda o público e exige recuperar novamente o projeto. A revisão de limpeza continua somente leitura. Consulte o guia e a [aceitação guiada](docs/PHASE_7_GUIDED_UPDATE_VERIFICATION.md).

## Segurança

- Mantenha senhas, tokens e dados de conexão fora do Git.
- Não inclua credenciais em documentação, scripts ou relatórios.
- Não publique por scripts antigos ou por upload manual para contornar uma falha do Editor.
- Em caso de falha, preserve a mensagem apresentada e investigue antes de repetir a operação.

## Preparação de uma versão

O checkpoint de 2026-10-04 integra a [correção de desempenho FTPS candidata à v1.1.1](docs/FTPS_PERFORMANCE_REPAIR_2026-10-04.md). `package.json` e lockfile permanecem em **1.1.0**; a tag e os artefatos v1.1.0 conservam sua proveniência. Aguarde a atualização do site e o teste final pelo mantenedor antes de uma preparação de versão separadamente autorizada. Este checkpoint de repositório não cria instalador, tag ou GitHub Release.

Depois da aceitação funcional e documental:

1. confirme que a branch de versão está limpa e sincronizada;
2. faça a integração revisada em `main`;
3. crie a tag da versão;
4. publique no GitHub Release somente os artefatos verificados destinados ao usuário;
5. registre os resultados da instalação, abertura e desinstalação.

Merge, tag e GitHub Release são ações explícitas e não fazem parte da publicação cotidiana de conteúdo.
