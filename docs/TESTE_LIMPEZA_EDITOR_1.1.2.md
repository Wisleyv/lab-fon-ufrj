# Teste da limpeza — Editor Labfonac 1.1.2

Esta versão reúne as três etapas: revisão compreensível, identificação automática das imagens necessárias e limpeza com recuperação. É uma versão preparada para teste; não constitui uma nova publicação no GitHub.

## Abrir a versão de teste

1. Feche todas as janelas do Editor anterior. Combine um horário em que nenhuma outra pessoa esteja atualizando o site.
2. Abra `C:\labfon-editor-release\v1.1.2-testing\win-unpacked\Lab-FON Editor.exe`. Não é necessário instalar ou desinstalar nada para este teste. Mantenha a pasta completa; o executável depende dos outros arquivos que estão nela.
3. Em **Ajuda → Sobre o Editor Labfonac**, confira a versão **1.1.2**. O instalador também está disponível na pasta `v1.1.2-testing`, mas não é necessário usá-lo agora.

A versão de teste usa o perfil e as pastas de trabalho habituais. Fechar o programa de teste e abrir o Editor anteriormente instalado permite voltar à versão anterior do programa. Isso não desfaz uma limpeza: para repor arquivos excluídos, use o botão de recuperação descrito abaixo. Não desinstale o Editor nem apague suas pastas de dados, pois as cópias de recuperação estão guardadas ali.

## Primeiro teste: revisar sem excluir

1. Em **Conectar**, abra o projeto remoto habitual. Confira se é o projeto esperado.
2. Salve eventuais alterações. Em **Publicar**, use **Atualizar site** e aguarde o sucesso. Essa atualização pela versão nova estabelece a comprovação necessária para a limpeza; uma atualização feita pela versão antiga pode não servir.
3. Em **Revisar**, abra **Prévia do site gerado**. Confira fotos, logotipos, textos e seções. Se precisar gerar novamente, faça isso antes de abrir a prévia.
4. Volte a **Publicar**, abra **Manutenção** e clique em **Revisar limpeza remota**. A revisão pode demorar porque confere os arquivos do servidor. A mensagem informa os arquivos conferidos e os dados recebidos; revisão não significa exclusão.
5. Abra os grupos da lista. Arquivos antigos de programação, imagens sem referência e cópias locais aparecem separadamente. A quantidade depende do projeto e das referências encontradas. Não é necessário selecionar arquivos individualmente: a autorização abrangerá toda a lista apresentada. Arquivos com uso incerto são preservados.

**Resultado esperado:** nenhum arquivo excluído; duas caixas de confirmação desmarcadas; botão **Excluir arquivos revisados** indisponível. Se faltar uma condição, a mensagem junto ao botão informa a próxima ação, como abrir a prévia, atualizar o site ou fazer uma nova revisão.

## Segundo teste: confirmações e cancelamento

1. Marque somente **Conferi a prévia atual**. O botão de exclusão deve continuar indisponível.
2. Marque também **Autorizo excluir todos os arquivos da lista revisada**. O botão deve ficar disponível.
3. Clique em **Excluir arquivos revisados** e escolha **Cancelar** na janela de confirmação.

**Resultado esperado:** mensagem de cancelamento, nenhuma exclusão e confirmações desmarcadas. Uma alteração no projeto ou uma nova revisão também deve exigir novas confirmações.

## Terceiro teste: executar a limpeza

Este teste exclui efetivamente os arquivos listados do servidor e do projeto local.

1. Faça uma nova revisão. Confira a lista e marque as duas confirmações.
2. Clique em **Excluir arquivos revisados**. Confira o resumo da janela e confirme a exclusão.
3. Aguarde a proteção das cópias, a exclusão e a conferência final. Não feche o Editor durante a operação.
4. Confira a mensagem de conclusão, com as quantidades remota e local. Abra o site público e confirme que as fotos, os logotipos e o conteúdo continuam corretos.
5. Faça uma nova revisão. Os arquivos removidos não devem voltar à lista. Arquivos preservados por referências ou incerteza podem continuar no servidor.

**Resultado esperado:** arquivos listados removidos, conteúdo atual preservado e cópias disponíveis para recuperação. Se uma lista, referência ou arquivo mudar, ou se uma cópia não puder ser conferida, a exclusão não deve começar. Se houver interrupção após começar, a mensagem indica a recuperação; não repita a limpeza antes de resolver a interrupção.

## Quarto teste: recuperar os arquivos

1. Em **Publicar → Manutenção**, clique em **Recuperar arquivos da última limpeza**.
2. Confirme e aguarde. Esse botão repõe os arquivos da limpeza no projeto local e nas duas áreas do servidor, preservando o conteúdo atual da página. Ele é diferente de **Recuperar versão anterior**, destinado à atualização/publicação do site.
3. Confira a mensagem de sucesso e o site público. Uma nova revisão poderá listar novamente os arquivos repostos. Para terminar sem eles, revise e confirme uma nova limpeza.

As cópias dessa limpeza ficam nas pastas de dados deste computador. A recuperação não sobrescreve arquivos novos ou alterados que ocupem os mesmos caminhos. Se ela não concluir, mantenha as cópias e solicite apoio técnico; a mensagem de erro não significa que elas foram apagadas.

## Informações úteis ao relatar um problema

Informe a versão, o botão acionado, a mensagem completa, a etapa em que parou e se o site continua correto. Uma captura da área **Manutenção** ajuda. Não inclua senha ou credenciais no relato.
