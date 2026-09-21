# Publicação e empacotamento

Este documento orienta desenvolvedores e responsáveis pela preparação de versões. Para manutenção comum do conteúdo, consulte o [Guia do Usuário do Editor Labfonac](docs/GUIA-DO-USUARIO.md).

## Modelo vigente

O site de produção é estático. O Editor Labfonac mantém uma cópia local de trabalho, salva o conteúdo, gera os arquivos do site e publica pelo acesso FTP configurado no próprio aplicativo.

Os caminhos remotos do projeto editável e do site publicado são controlados pelo Editor. Não devem ser escolhidos manualmente pelo mantenedor.

Não há backend, banco de dados ou processo de build no servidor. Também não há publicação automática a partir de `main`: uma alteração no GitHub não substitui a revisão e a publicação explícita pelo Editor.

## Verificação do código-fonte

Em uma cópia limpa do repositório:

```powershell
npm ci
npm test -- --run
npm run build
```

O comando `npm run build` gera o site estático em `dist/`. Esse diretório é gerado e ignorado pelo Git.

## Aplicativo Windows

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

O instalador `v1.0.0` não possui assinatura digital. O Windows pode indicar fornecedor desconhecido ou exibir um aviso de reputação. Isso deve ser comunicado com neutralidade; não desative nem oriente o usuário a desativar proteções do sistema.

## Publicação do site

O fluxo operacional aceito é executado no Editor:

1. abrir o projeto remoto;
2. editar e salvar o conteúdo e a página;
3. usar **Gerar site**;
4. revisar em **Prévia do site gerado**;
5. validar a conexão;
6. usar **Atualizar projeto remoto**;
7. usar **Publicar site**;
8. verificar manualmente o site público.

Salvar conteúdo, atualizar o projeto editável remoto e publicar o site são operações diferentes. Nenhuma publicação deve ser presumida após um salvamento local.

## Segurança

- Mantenha senhas, tokens e dados de conexão fora do Git.
- Não inclua credenciais em documentação, scripts ou relatórios.
- Não publique por scripts antigos ou por upload manual para contornar uma falha do Editor.
- Em caso de falha, preserve a mensagem apresentada e investigue antes de repetir a operação.

## Preparação de uma versão

Depois da aceitação funcional e documental:

1. confirme que a branch de versão está limpa e sincronizada;
2. faça a integração revisada em `main`;
3. crie a tag da versão;
4. publique no GitHub Release somente os artefatos verificados destinados ao usuário;
5. registre os resultados da instalação, abertura e desinstalação.

Merge, tag e GitHub Release são ações explícitas e não fazem parte da publicação cotidiana de conteúdo.
