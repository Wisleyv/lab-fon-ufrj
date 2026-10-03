# Editor Labfonac v1.1.0

Release de manutenção do site do Laboratório de Fonética Acústica - UFRJ, concebida e desenvolvida por Wisley Vilela, com financiamento PPGLEV/UFRJ e licença MIT. Requer projeto e servidor compatíveis com o fluxo do laboratório.

## Novidades

- **Atualizar site** conduz validação, proteção/atualização da fonte, geração e proteção/publicação do site.
- Retry e reconciliação de operações interrompidas, com recibos verificados.
- Recuperação explícita separada do site publicado e do projeto editável; após recuperar a fonte, abra novamente o projeto remoto.
- Recuperação remota, geração/prévia locais e revisão de limpeza somente leitura; exclusão remota continua desabilitada.
- Identidade Editor Labfonac, guia e handover de continuidade, com separação entre software público e conteúdo institucional privado.

## Instalação e atualização

Windows x64: use `Lab-FON-Editor-Setup-1.1.0.exe` ou extraia integralmente `Lab-FON-Editor-Portable-1.1.0.zip` e abra `Lab-FON Editor.exe`. Nomes/identificadores históricos foram preservados para upgrade de 1.0.0. Feche o Editor antes de atualizar e preserve trabalhos, backups e recibos. Instalar/atualizar o aplicativo não publica conteúdo.

O suporte deve preparar Node.js/npm no PATH (conjunto de ferramentas requer Node ≥22.12; aceitação com Node 22.16.0/npm 10.9.2) e acesso ao registry para dependências do projeto. O instalador não inclui esse toolchain. Use FTPS explícito com certificado válido; obtenha acesso do administrador institucional fora do Git. A distribuição não tem assinatura digital: confirme origem/checksums sem desativar proteção do Windows.

## Integridade e proveniência

- Instalador SHA-256: `68d2c07142301b3afa4f6b57b942805fa0ee7f04c5274cb5d91bc14d627260f2`.
- ZIP portátil SHA-256: `816967cd2e0c13dbe0618000da25ad3c4cae0e570fffb6000fb2c4f92f46f8b6`.
- `SHA256SUMS.txt` e estas notas acompanham os dois binários na [release oficial](https://github.com/Wisleyv/lab-fon-ufrj/releases/tag/v1.1.0).

O tag `v1.1.0` identifica a fonte final. Artefatos aceitos foram construídos de `bc6ca74`; a finalização posterior muda somente documentação excluída das entradas de empacotamento. [Registro de aceitação/proveniência](https://github.com/Wisleyv/lab-fon-ufrj/blob/v1.1.0/docs/RELEASE_CANDIDATE_1.1.0.md). Instalação, upgrade, portátil, Sobre/links, FTPS read-only, geração/prévia e privacidade foram verificados; não foi necessária nova publicação em produção.

## Limites aceitos e continuidade

Seis fixtures/assertions antigas permanecem não verdes; findings de dependências permanecem não bloqueantes sob as restrições documentadas: projetos/inputs confiáveis, servidores dev em loopback, sem Vitest UI/Browser Mode no Windows nesta baseline. Isso não é clearance geral de segurança. A conta descartável antiga não é requisito de entrega. Credenciais, conteúdo institucional, workspaces, backups e evidências privadas não acompanham software/artefatos públicos.

[Guia do usuário](https://github.com/Wisleyv/lab-fon-ufrj/blob/v1.1.0/docs/GUIA-DO-USUARIO.md) e [handover técnico](https://github.com/Wisleyv/lab-fon-ufrj/blob/v1.1.0/docs/ARCHITECTURE_AND_OPERATIONS_HANDOVER.md) explicam manutenção, recuperação, arquivo privado e papéis ainda pendentes de designação institucional.
