# Editor Labfonac 1.1.0 — candidato de release

Status: **Fase 4 aprovada — candidato 1.1.0 construído e aceito, ainda não publicado.** Fase 5 pronta para instrução separada; este documento não autoriza merge, tag, GitHub Release ou escrita/limpeza em produção.

## Entradas congeladas

Base de software: `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7`, branch `work/post-v1.0-hardening-2026-10-02`. Incluem-se as revisões documentais aceitas das Fases 1–3: guia e cinco imagens com proveniência, README/deployment/índice, inventário, convergência sanitizada, handover, auditoria de continuidade e contextualização/nomenclatura dos relatórios históricos. Nenhum conteúdo institucional ignorado, credencial, backup, workspace ou evidência temporária é entrada de empacotamento.

Versão selecionada: **1.1.0**. A atualização acrescenta funcionalidades compatíveis — recuperação remota, atualização guiada, backups/recuperação, reconciliação/retry e revisão somente leitura — além de correções. Não há mudança incompatível do contrato suportado. `package.json` é a fonte da versão; o lockfile a espelha e o diálogo usa `app.getVersion()`.

## Notas de release — rascunho

- Fluxo cotidiano guiado **Atualizar site**, com proteção/verificação da fonte e do público.
- Retry e reconciliação de operações interrompidas; recuperação explícita separada de fonte e site publicado.
- Recuperação remota seguida de geração/prévia local; revisão de limpeza sem exclusão.
- Identidade Editor Labfonac, autoria/financiamento/licença MIT e separação entre software público e conteúdo institucional privado.
- Guia e handover com requisitos Windows/Node.js/npm, FTPS estrito, limites de backup e custódia.

## Instalação, atualização e distribuição

Artefatos aceitos: `Lab-FON-Editor-Setup-1.1.0.exe` e `Lab-FON-Editor-Portable-1.1.0.zip`, com SHA-256 abaixo. Instalador NSIS x64 por usuário; ZIP contém a distribuição `win-unpacked` completa sob `Lab-FON-Editor-Portable/`. Identificadores de instalação, atalhos e executável `Lab-FON Editor.exe` mantêm a nomenclatura histórica para compatibilidade de upgrade.

Feche o Editor antes de instalar/atualizar; preserve trabalhos, backups e recibos privados. Instalar/atualizar não publica o site. O suporte deve preparar Node.js/npm no PATH e verificar a geração; o aplicativo não inclui o toolchain completo. Extraia todo o ZIP portátil e mantenha seus arquivos juntos. Não misture dependências de builds diferentes.

O candidato não tem assinatura digital; confirme origem/checksum, sem desativar proteção do Windows. Desinstalar remove o aplicativo; dados de trabalho/recuperação exigem preservação e decisão separada, não exclusão automática.

## Limites e gates

Continuam as seis assertions/fixtures obsoletas e os findings/restrições de dependências descritos na [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md). A conta descartável antiga não é requisito permanente de entrega. Não se repetiu aceitação destrutiva já suficiente. A aceitação abaixo comprovou os requisitos de Fase 4 sem demonstrar novo blocker.

O link do guia aponta a `main` e o de última versão à release publicada: durante preparação privada podem anteceder 1.1.0. A integração documental autorizada deve preceder a publicação futura. Estes limites não afirmam que uma release nova já existe.

## Checkpoint, artefatos e integridade

**Fonte efetivamente empacotada:** `bc6ca74ddfd963e5433b67447c4c16fa4804228f`, commit limpo contendo os 28 arquivos revisados de documentação/imagens/metadados. Build feito em clone separado sem conteúdo ignorado. As atualizações posteriores deste registro/guia/README são somente documentais; não foram entradas de um segundo build nem mudam o executável aceito.

| Artefato | SHA-256 |
| --- | --- |
| `Lab-FON-Editor-Setup-1.1.0.exe` | `68d2c07142301b3afa4f6b57b942805fa0ee7f04c5274cb5d91bc14d627260f2` |
| `Lab-FON-Editor-Portable-1.1.0.zip` | `816967cd2e0c13dbe0618000da25ad3c4cae0e570fffb6000fb2c4f92f46f8b6` |

`resources/app.asar`: `f0c47984c179829451d8b6459acb20ac9e22ab4ba08419dd1fbfd36d10c79885`. O mesmo hash foi conferido no pacote limpo instalado, no upgrade e na distribuição portátil. Artefatos, `SHA256SUMS.txt`, logs e evidências são externos ao Git; dados de acesso, backups e projetos ficam separados da entrega pública.

Reprodução: checkout desse commit, `npm ci`, `npm run editor:build`; criar ZIP da árvore inteira `release/win-unpacked`, preservando a estrutura, e verificar todos os arquivos após extração. Ambiente: Windows 11 x64, Node 22.16.0, npm 10.9.2, Electron 44.0.0. Os hashes identificam os artefatos testados; não se promete identidade binária de rebuilds sob outros ambientes/timestamps.

## Aceitação dos artefatos reais

| Verificação | Resultado e limite |
| --- | --- |
| Build | Instalação do lockfile, renderer/NSIS/dir e build software-only passaram. Testes existentes de startup/menu: 12/12; suíte ampla não repetida por mudança limitada à versão/documentação. |
| Instalação limpa | Instalador real em diretório de teste isolado, registro 1.1.0 e atalho Iniciar correto; primeira desinstalação removeu aplicativo. Não foi uma conta/VM Windows nova; configuração NSIS por usuário, sem elevação. |
| Upgrade | Instalador original 1.0.0 estabeleceu baseline no diretório isolado; instalador 1.1.0 realizou upgrade com mesma identidade. Asar instalado idêntico ao do pacote limpo/portátil. Não se substituiu permanentemente a instalação diária do usuário. |
| Startup instalado/portátil | Executáveis reais com `app.isPackaged` verdadeiro e versão 1.1.0, perfil de teste isolado e seis abas; menus Arquivo/Editar/Exibir/Janela/Ajuda. ZIP extraído iniciou com o próprio caminho; seus 73 arquivos coincidem byte a byte com `win-unpacked`. |
| Ícone/Sobre/links | Ícone nativo extraído do executável inspecionado visualmente; diálogo nativo mostrou Editor Labfonac 1.1.0, Wisley Vilela, PPGLEV/UFRJ e MIT. Botão nativo Guia abriu o destino esperado no navegador; quatro links retornaram HTTP 200. Limite de main/latest anterior à publicação descrito acima. |
| Recuperação/geração/revisão | Aplicativo empacotado recuperou projeto institucional com FTPS estrito, validou, gerou e exibiu prévia HTTP 200. Edição/salvamento local passaram; valor original foi restaurado e gerado novamente. Atualizar site ficou habilitado. Escritas remotas foram impedidas no driver: nenhuma publicação institucional foi executada. |
| Paridade de manutenção | Main/menu empacotados coincidem com fonte congelada; recibos/aceitação anterior de guided update/falha/recovery continuam autoridade. Não se alega nova publicação destrutiva por esse smoke. |
| Bundle/privacidade | 45 entradas no asar, restritas a desktop, renderer/marca, ícone, LICENSE, package e basic-ftp. Sem content/examples/docs/scripts/testes, credenciais, fonte institucional, workspaces, backups ou evidência de teste. Metadados de versão consistentes e licença presente. |
| Desinstalação/preservação | Desinstalação após upgrade removeu executável/registro de teste; registro/atalho originais 1.0.0 restaurados, instalação diária preservada. 1.288 arquivos críticos privados conferidos na preservação; caches de navegador ativos/voláteis estavam bloqueados e não são backups completos de perfil. Nenhuma exclusão de dados editoriais/recuperação foi solicitada. |

Inspector/CDP/UI Automation foram usados apenas nos helpers externos para observar o pacote real, isolar userData e bloquear mutação em produção; nenhum helper foi distribuído. Races iniciais de startup do driver foram resolvidos aguardando inicialização, sem correção no aplicativo. Nenhuma mudança de código/configuração/dependências foi necessária.

**Decisão final:** Fase 4 aprovada; nenhum blocker de artefato/continuidade identificado. Fase 5 pode começar por instrução explícita de revisão/integração e handoff da fonte e destes artefatos/checksums, com custódia privada separada. Merge, tag e publicação continuam não autorizados nesta fase. Não houve produção modificada, limpeza, história reescrita ou trabalho alheio ao candidato.
