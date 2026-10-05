# Editor Labfonac 1.1.2 — encerramento do sprint

## Resultado e aceite técnico

O mantenedor informou nesta sessão: **“Houve êxito nos testes. O servidor remoto contém apenas arquivos pertinentes ao site.”** Esse resultado encerra as três etapas: explicação da revisão, inspeção das referências para evitar transferências desnecessárias e limpeza confirmada com recuperação coordenada. Não há tarefa de implementação pendente neste sprint.

A aceitação do mantenedor fundamenta a publicação autorizada da [versão 1.1.2](https://github.com/Wisleyv/lab-fon-ufrj/releases/tag/v1.1.2). A preparação do release não acessa nem altera o servidor FTP, o conteúdo institucional ou a instalação em uso.

## Origem e conferência dos pacotes

- Código empacotado: `1c83f71da309d6c4bf4bed73c0cde03e9d5bbc6b`, versão 1.1.2. As alterações posteriores de encerramento são exclusivamente Markdown, fora dos arquivos incluídos no aplicativo. Não houve recompilação dos binários aceitos nem atualização de dependências.
- Instalador reutilizado de `C:\labfon-editor-release\v1.1.2-testing`; distribuição oficial preparada em `C:\labfon-editor-release\v1.1.2-official`.
- Os três hashes registrados da distribuição testada foram reconferidos. Os 15 módulos desktop e a licença no `app.asar` correspondem ao checkout, com normalização de finais de linha. Os metadados empacotados indicam 1.1.2; electron-builder remove os campos de desenvolvimento, como esperado. O pacote não contém conteúdo institucional, credenciais ou documentação interna.
- O ZIP portátil contém os 74 arquivos do runtime completo, sob `Lab-FON-Editor-Portable/`. Todos foram lidos do ZIP e comparados por SHA-256 com a distribuição testada.
- Validação de implementação já concluída: 247 testes pertinentes; builds do site e do Editor; interface em 1024 e 375 px; execução do aplicativo empacotado com dados isolados; ciclo de geração, publicação, revisão, cancelamento, exclusão e recuperação em ambiente descartável. Esses testes não foram repetidos para alterações exclusivamente documentais. A conferência dos pacotes foi realizada novamente neste encerramento.

| Pacote | SHA-256 |
| --- | --- |
| `Lab-FON-Editor-Setup-1.1.2.exe` | `4462459b7f2a7a9bb5d476d76bdf55fe732f2729678fc777c0850de7c6898911` |
| `Lab-FON-Editor-Portable-1.1.2.zip` | `3152a523b79ff0c1641b574147d51939b9fc2024e734241cc65b332cbf78658d` |

`app.asar`: `dd2d74adfa35704e7a23e91674dd31d204e920a4c20834ce48d8f24c0fe03a45`. A release distribui os dois pacotes, `RELEASE_NOTES.md` e `SHA256SUMS.txt`. O instalador permanece sem assinatura digital; nenhum ajuste nas proteções do Windows é necessário ou foi realizado neste encerramento.

## Organização e limites

Na inspeção de encerramento, o GitHub tinha somente `main`, nenhuma issue aberta e nenhum PR aberto. Não é necessária nova branch para o registro documental. A referência local de um worktree temporário já inexistente é removida sem apagar arquivos. As versões 1.0.0, 1.1.0 e 1.1.1 permanecem preservadas.

Os registros antigos de falha no GitHub Actions pertencem ao workflow histórico de publicação, ausente do código atual. Não há workflow ativo no checkout nem nova execução de deploy como parte desta entrega; não se declara uma execução de CI aprovada para este release.

Publicação técnica e aceite do mantenedor não substituem o aceite institucional da Coordenação. Continuam externas ao sprint: formalizar recebimento e responsáveis pela custódia, garantir armazenamento restrito e backup do acervo privado, conferir o recibo e provisionar acessos próprios do responsável sucessor. O histórico dessas providências está em [FINAL_OPERATIONAL_CLOSURE.md](FINAL_OPERATIONAL_CLOSURE.md). Não são defeitos do release nem novas tarefas de programação.

Orientação atualizada: [guia do usuário](GUIA-DO-USUARIO.md), [roteiro de teste aceito](TESTE_LIMPEZA_EDITOR_1.1.2.md) e [notas da versão](RELEASE_NOTES_1.1.2.md).

## Publicação verificada

A versão foi publicada em **4 de outubro de 2026, às 23h43, horário de Brasília**, como release estável mais recente. A tag anotada `v1.1.2` identifica `52df5b25d3957389201c0f7898c344cb6f357f48`; sua diferença para o código empacotado consiste somente nos quatro documentos de encerramento.

Os quatro anexos foram baixados e conferidos por SHA-256 enquanto a release era rascunho e novamente, sem autenticação, após a publicação. O texto da release corresponde às notas anexadas. O endereço `releases/latest` resolve para 1.1.2; os links para a documentação também foram conferidos. Hash das notas: `ba27dee7f83ee086946e0c54573351ed53db1af59f23079bd6ab75bd0ac64f29`; hash de `SHA256SUMS.txt`: `c7af258d74b1ce3d7222c989993ce3bf8b528d1c8d24b8a5531bf654ba409d0c`.

Este complemento de evidência avança `main` somente por documentação; a tag e os anexos publicados permanecem imutáveis. A referência órfã do worktree temporário foi removida. A organização final conserva somente `main`, sem branches temporárias, PRs ou issues abertos. Não há bloqueador técnico de encerramento identificado.
