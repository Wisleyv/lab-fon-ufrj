# Algoritmo de desenvolvimento — Lab-FON Editor

### Objetivo

Desenvolver um aplicativo desktop para Windows que permita a um usuário sem conhecimentos técnicos **editar, estruturar, visualizar e publicar localmente a página única do Lab-FON**, sem editar diretamente código-fonte ou arquivos JSON.

O aplicativo deve operar localmente e produzir os mesmos arquivos estáticos que constituem o site público.

### Algoritmo

1. **Analise o repositório atual do Lab-FON antes de modificar qualquer arquivo.**

2. **Preserve a arquitetura existente do site**, especialmente a separação entre dados, adapters, renderização e build.

3. **Crie uma aplicação desktop para Windows**, integrada ao projeto existente, destinada exclusivamente à manutenção local do site.

4. **Permita ao usuário abrir um projeto Lab-FON existente** a partir de uma pasta local.

5. **Leia e interprete os arquivos de conteúdo existentes**, sem exigir que o usuário conheça ou edite JSON.

6. **Represente a página inicial como uma sequência ordenada de seções editáveis.**

   Exemplo conceitual:

   ```text
   Página inicial
   ├── Cabeçalho
   ├── Apresentação
   ├── Pesquisadores
   ├── Linhas de pesquisa
   ├── Publicações
   ├── Projetos
   ├── Parcerias
   └── Rodapé
   ```

7. **Permita ao usuário:**

   * editar o conteúdo de cada seção;
   * acrescentar uma seção;
   * remover uma seção;
   * reordenar as seções;
   * duplicar uma seção quando aplicável;
   * editar os elementos pertencentes a cada seção;
   * adicionar, substituir ou remover imagens e outros arquivos associados.

8. **Utilize tipos de seção predefinidos.**
   O usuário deve manipular a estrutura da página por meio desses tipos, e não por edição livre de HTML, CSS ou JavaScript.

9. **Faça com que cada tipo de seção possua um formulário de edição apropriado ao seu conteúdo.**

10. **Mantenha conteúdo e apresentação separados.**
    As alterações realizadas pelo usuário devem modificar os dados estruturados e a composição da página, não o código dos componentes de apresentação.

11. **Valide todas as alterações antes de salvá-las**, verificando:

    * campos obrigatórios;
    * tipos de dados;
    * referências;
    * arquivos associados;
    * estrutura válida da página.

12. **Preserve a integridade dos dados existentes.**
    Uma alteração em uma seção não deve modificar ou eliminar dados pertencentes a outras seções.

13. **Implemente uma visualização da página dentro do aplicativo**, utilizando os mesmos componentes/renderizadores empregados pelo site.

14. **Permita ao usuário alternar entre edição e visualização**, de modo que ele possa verificar o resultado antes da publicação.

15. **Implemente uma operação "Validar"**, que execute todas as verificações necessárias e informe claramente os problemas encontrados.

16. **Implemente uma operação "Gerar site"**, que:

    * valide os dados;
    * execute o processo de build existente;
    * produza a versão estática completa da página;
    * informe eventuais erros.

17. **Permita visualizar o resultado efetivamente gerado pelo build** antes da publicação.

18. **Implemente a publicação por FTP**:

    * configurar servidor, usuário e demais parâmetros necessários;
    * armazenar credenciais de maneira segura no Windows;
    * testar a conexão;
    * enviar os arquivos produzidos pelo build;
    * informar o resultado da operação.

19. **Nunca altere diretamente os arquivos publicados no servidor durante a edição.**
    Toda alteração deve ocorrer localmente e somente ser publicada após validação e build bem-sucedidos.

20. **Crie uma cópia de segurança local do conteúdo antes de cada publicação.**

21. **Registre o resultado de cada publicação**, incluindo data, hora, arquivos enviados e eventual erro.

22. **Implemente tratamento de erros que impeça a publicação de um site sabidamente inválido.**

23. **Mantenha o aplicativo independente de qualquer serviço externo para edição, armazenamento ou funcionamento.**

24. **Não introduza servidor, banco de dados, backend, serviço de nuvem ou infraestrutura adicional.**

25. **Não criar um sistema de edição HTML/CSS livre.**
    A flexibilidade do usuário deve ocorrer por meio das seções e campos definidos pelo aplicativo.

26. **Mantenha a página resultante acessível e visualmente consistente.**
    O usuário não deve conseguir, por meio do editor, criar uma estrutura que viole deliberadamente as regras de acessibilidade ou o design system do site.

27. **Crie testes para o modelo de dados, operações de edição, validação, composição das seções e geração do site.**

28. **Após cada funcionalidade implementada, utilize o próprio Lab-FON como caso real de teste:** altere uma cópia do conteúdo, gere a página e verifique se o resultado corresponde ao esperado.

29. **Não reescreva a aplicação existente desnecessariamente.**
    Estenda as abstrações existentes sempre que elas forem adequadas ao novo editor.

30. **Ao final da implementação, o fluxo completo deve ser:**

```text
Abrir projeto
     ↓
Editar conteúdo
     ↓
Adicionar/remover/reordenar seções
     ↓
Visualizar
     ↓
Validar
     ↓
Gerar site
     ↓
Visualizar resultado
     ↓
Publicar por FTP
```

31. **Considere o aplicativo concluído somente quando esse fluxo puder ser executado por um usuário leigo, sem necessidade de editar manualmente JSON, HTML, CSS ou JavaScript.**

---

### Instrução final:

> **Desenvolva incrementalmente. Antes de implementar uma nova funcionalidade, examine o estado atual do projeto, identifique as abstrações que podem ser reutilizadas e implemente apenas a próxima etapa necessária. Após cada etapa, execute os testes e verifique o funcionamento do site. Não antecipe funcionalidades não solicitadas.**