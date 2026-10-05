# Editor Labfonac 1.1.2

Esta versão conclui as melhorias de manutenção de arquivos do site. O mantenedor confirmou o êxito dos testes e informou que o servidor remoto contém apenas arquivos pertinentes ao site.

- O Editor inspeciona as referências do conteúdo e do código para evitar transferir imagens comprovadamente sem uso. Imagens compartilhadas, registros inativos e referências incertas continuam protegidos.
- **Publicar → Manutenção → Revisar limpeza remota** apresenta os arquivos propostos e o andamento da revisão. Revisar não exclui arquivos.
- A exclusão exige conferir a prévia atual, autorizar a lista revisada e confirmar na janela final. Antes de excluir, o Editor prepara e verifica cópias de recuperação do projeto local e dos dois destinos remotos.
- **Recuperar arquivos da última limpeza** repõe os arquivos da limpeza, inclusive após uma interrupção. Arquivos novos no mesmo caminho não são sobrescritos.

## Instalação

Feche o Editor, preserve os trabalhos e as cópias de recuperação e instale `Lab-FON-Editor-Setup-1.1.2.exe`. Como alternativa, extraia todo o arquivo `Lab-FON-Editor-Portable-1.1.2.zip` e abra `Lab-FON Editor.exe` na pasta extraída. Confira a versão em **Ajuda → Sobre o Editor Labfonac**. A instalação da versão não atualiza nem limpa o site automaticamente.

O instalador permanece sem assinatura digital. Confirme a origem oficial; mantenha as proteções do Windows. A geração do site continua dependendo de Node.js/npm preparados pelo suporte no computador.

## Validação e orientação

A etapa de implementação passou por 247 testes pertinentes, builds do site e do Editor, verificação da interface e execução do aplicativo empacotado. A aceitação no servidor real foi realizada e informada pelo mantenedor. O instalador testado foi preservado sem recompilação; todos os arquivos do ZIP portátil foram conferidos contra a distribuição testada. `SHA256SUMS.txt` permite conferir os dois pacotes e estas notas.

Consulte o [guia do usuário](https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md), o [roteiro de teste](https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/TESTE_LIMPEZA_EDITOR_1.1.2.md) e o [registro de encerramento](https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/RELEASE_CLOSURE_1.1.2.md).

A revisão e a proteção podem demorar enquanto conferem os arquivos remotos. Referências de outros sites fora da raiz FTP não podem ser inspecionadas. Preserve as pastas de dados do Editor: elas guardam as cópias necessárias à recuperação.
