# Guia do Usuário do Editor Labfonac

## 1. O que é o Editor Labfonac

O Editor Labfonac é o aplicativo usado para manter o conteúdo do site do Laboratório de Fonética da UFRJ. Nele, você pode recuperar o projeto do servidor, editar textos e registros, revisar o resultado e publicar a nova versão do site.

A manutenção normal deve ser feita pelo próprio Editor. Não é necessário manipular arquivos internos do projeto nem usar programas de FTP.

## 2. Instalação

### Instalação recomendada

1. Abra o arquivo `Lab-FON-Editor-Setup-1.0.0.exe`.
2. Aguarde o término da instalação. Normalmente, não é necessária permissão de administrador.
3. Abra o menu Iniciar do Windows e selecione **Lab-FON Editor**.

O instalador atual não possui assinatura digital. Em outro computador, o Windows pode identificar o editor como sendo de um fornecedor desconhecido ou exibir um aviso de segurança ou reputação. Leia o aviso e confirme que o arquivo recebido é o instalador oficial do Lab-FON. Não desative os recursos de segurança do Windows.

### Versão portátil

A pasta `Lab-FON-Editor-Portable` contém uma versão que funciona sem instalação. Para usá-la, mantenha todos os arquivos da pasta juntos e abra **Lab-FON Editor.exe**. Essa é uma alternativa; para o uso cotidiano, prefira a versão instalada.

## 3. Conectar e abrir o projeto

Tenha em mãos o servidor, a porta, o usuário e a senha fornecidos pela pessoa responsável pelo site. Não compartilhe nem registre essas credenciais em documentos públicos.

1. Abra a aba **Conectar**.
2. Preencha **Servidor**, **Porta**, **Usuário** e **Senha**.
3. Mantenha **Usar FTP/TLS** marcado quando essa for a configuração informada para o servidor.
4. Clique em **Conectar** e aguarde a confirmação. O Editor localiza e verifica automaticamente o projeto remoto.
5. Use **Salvar configuração** somente se quiser conservar a configuração para sessões futuras.
6. Antes de publicar, use **Testar conexão** e aguarde a confirmação do Editor.
7. Abra a aba **Projeto** e clique em **Abrir projeto remoto**.
8. Aguarde o download e a verificação. O progresso pode passar por mensagens como “Conectando...”, “Localizando arquivos...”, “Baixando projeto...” e “Verificando projeto...”.
9. Continue somente quando o Editor informar que o projeto remoto foi aberto em uma cópia local de trabalho.

Os locais corretos do projeto editável e do site publicado são administrados automaticamente pelo aplicativo. Você não precisa escolher pastas no servidor.

## 4. Editar conteúdo

### Aba Conteúdo

Na aba **Conteúdo**, escolha a área que deseja editar. Somente áreas habilitadas na página são apresentadas. Faça uma alteração por vez e confira os campos antes de clicar em **Salvar conteúdo**.

Use **Descartar alterações** para abandonar mudanças ainda não salvas. Ao trocar de área ou de registro, observe os avisos do Editor: a troca pode ser bloqueada enquanto existirem alterações não salvas.

#### Site

Em **Site**, é possível manter os textos gerais e elementos institucionais, incluindo cabeçalho, apresentação, seção “Sobre” e rodapé. Revise com cuidado títulos, descrições, links, contatos e textos alternativos de imagens.

#### Linhas de Pesquisa

Em **Linhas de Pesquisa**, selecione um registro existente ou use **Adicionar registro**. Os campos de uso comum são **Nome** e **Descrição**.

A seção **Edição avançada** contém **Ícone** e **Ordem de exibição**. Normalmente, não é necessário alterá-los. Uma mudança incorreta pode afetar a apresentação ou a posição da linha no site; edite esses controles somente quando compreender o resultado esperado.

#### Equipe

Em **Equipe**, selecione a pessoa que deseja atualizar ou use **Adicionar registro**. É possível editar informações como nome, instituição, categoria, distinção e currículo, além de carregar ou alterar a foto.

Confira se a categoria está correta e se a foto corresponde à pessoa antes de salvar. Para excluir uma pessoa, selecione o registro certo antes de usar **Remover registro**.

#### Extensão e PROVALE

Em **Extensão**, mantenha as informações dos projetos de extensão, incluindo título, apresentação, imagem, coordenação, redes sociais e a integração do Instagram quando disponível. O PROVALE é mantido nessa área.

Ao alterar o Instagram do PROVALE, informe somente um perfil ou endereço válido e confira a prévia antes de publicar. Se **Extensão** não aparecer em **Conteúdo**, verifique primeiro se essa seção está habilitada na aba **Página**.

#### Parcerias

Em **Parcerias**, é possível adicionar ou atualizar instituição, sigla, localização, tipo, descrição, site e logotipo. Use **Carregar logo** ou **Alterar logo** para escolher uma imagem. Confira o nome, o endereço do site e a aparência do logotipo antes de salvar.

### Aba Página

A aba **Página** controla quais seções aparecem no site e em que ordem.

- Use **Subir** e **Descer** para reorganizar uma seção.
- Use **Remover da página** somente quando a seção realmente não deva aparecer.
- Para recolocar uma seção disponível, escolha-a, indique a **Posição** e clique em **Adicionar seção**.
- Use **Preview** para conferir a composição.
- Clique em **Salvar página** para conservar a nova organização.
- Use **Descartar alterações da página** para voltar à composição salva.

Salvar a página e salvar o conteúdo são ações separadas. Se você alterou os dois, salve ambos antes de revisar.

## 5. Salvar, revisar e publicar

Salvar uma edição não publica o site. O trabalho normal segue esta ordem:

1. Faça as alterações na aba **Conteúdo** e clique em **Salvar conteúdo**.
2. Se alterou a composição, abra **Página**, use **Preview** e clique em **Salvar página**.
3. Abra **Revisar** e clique em **Gerar site**.
4. Quando a geração terminar, clique em **Prévia do site gerado**.
5. Examine a prévia, especialmente os textos, links, imagens, ordem das seções e registros alterados.
6. Confirme que **Testar conexão**, na aba **Conectar**, foi concluído com sucesso.
7. Abra **Publicar** e clique em **Atualizar projeto remoto**. Confirme a operação e aguarde a mensagem de sucesso.
8. Ainda em **Publicar**, clique em **Publicar site**, leia a confirmação apresentada e prossiga somente se estiver publicando a versão revisada.
9. Aguarde a confirmação de que o site foi publicado.
10. Abra o site público no navegador e verifique manualmente o resultado.

O botão **Inicializar projeto remoto** não faz parte da manutenção cotidiana. Ele se destina à preparação inicial de um servidor e só deve ser usado com orientação específica.

## 6. Antes de publicar

- Salve todas as alterações e revise a prévia antes de publicar.
- Não feche o projeto nem escolha outro projeto quando o Editor indicar alterações não salvas. Salve-as ou descarte-as conscientemente.
- Não altere opções avançadas apenas para experimentar.
- Leia as mensagens de confirmação antes de atualizar ou publicar.
- Depois da publicação, abra o site público e confira exatamente o conteúdo alterado.
- Se houver falha de conexão, recuperação, atualização ou publicação, pare e investigue a mensagem apresentada. Não tente contornar o problema com alterações manuais por FTP.

## 7. Situações comuns

### Não foi possível conectar

Confira **Servidor**, **Porta**, **Usuário**, **Senha** e **Usar FTP/TLS**. Tente **Conectar** novamente apenas depois de corrigir os dados. Se o erro continuar, registre a mensagem exibida e procure a pessoa responsável pelo acesso ao servidor.

### O projeto remoto não abre

Confirme primeiro que a conexão foi estabelecida. Depois, na aba **Projeto**, use **Abrir projeto remoto** e aguarde todas as etapas. Se a recuperação ou a verificação falhar, não escolha pastas manualmente nem tente montar o projeto por FTP; registre a mensagem e investigue a causa.

### Há alterações não salvas

Volte à aba indicada e escolha **Salvar conteúdo**, **Salvar página**, **Descartar alterações** ou **Descartar alterações da página**, conforme o caso. O Editor pode impedir a troca ou o fechamento do projeto para proteger o trabalho em andamento.

### A publicação não está disponível ou falhou

Confirme, nesta ordem, que o projeto está aberto, as alterações estão salvas, **Gerar site** terminou com sucesso, a prévia está atualizada e **Testar conexão** foi concluído. Se uma operação falhar, não repita várias vezes nem faça um envio manual: preserve a mensagem apresentada para análise.

### Versão instalada ou portátil

Use normalmente **Lab-FON Editor** pelo menu Iniciar. A versão portátil deve ser aberta pelo arquivo **Lab-FON Editor.exe** dentro de `Lab-FON-Editor-Portable`. Não mova somente o executável para fora dessa pasta, pois ele depende dos arquivos que o acompanham.
