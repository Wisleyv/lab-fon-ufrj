# Editor Labfonac 1.1.0 — candidato de release

Status: preparação de candidato, ainda não publicado. Este documento não autoriza merge, tag, GitHub Release ou escrita/limpeza em produção.

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

Artefatos previstos: `Lab-FON-Editor-Setup-1.1.0.exe` e `Lab-FON-Editor-Portable-1.1.0.zip`, com SHA-256 registrados após geração/aceitação. Instalador NSIS x64 por usuário; ZIP contém a distribuição `win-unpacked` completa. Identificadores de instalação, atalhos e executável `Lab-FON Editor.exe` mantêm a nomenclatura histórica para compatibilidade de upgrade.

Feche o Editor antes de instalar/atualizar; preserve trabalhos, backups e recibos privados. Instalar/atualizar não publica o site. O suporte deve preparar Node.js/npm no PATH e verificar a geração; o aplicativo não inclui o toolchain completo. Extraia todo o ZIP portátil e mantenha seus arquivos juntos. Não misture dependências de builds diferentes.

O candidato não tem assinatura digital; confirme origem/checksum, sem desativar proteção do Windows. Desinstalar remove o aplicativo; dados de trabalho/recuperação exigem preservação e decisão separada, não exclusão automática.

## Limites e gates

Continuam as seis assertions/fixtures obsoletas e os findings/restrições de dependências descritos na [auditoria de continuidade](CONTINUITY_REPRODUCIBILITY_AUDIT.md). A conta descartável antiga não é requisito permanente de entrega. Não se repete aceitação destrutiva já suficiente. O candidato precisa comprovar instalação limpa, upgrade, smoke nativo/portátil, links/Sobre, geração/revisão e privacidade do bundle antes de aprovação de Fase 4.

O link do guia aponta a `main` e o de última versão à release publicada: durante preparação privada podem anteceder 1.1.0. A integração documental autorizada deve preceder a publicação futura. Estes limites não afirmam que uma release nova já existe.

Hashes do checkpoint/artefatos e resultado final serão registrados após aceitação; até lá, Fase 4 pendente e Fase 5 não iniciada.
