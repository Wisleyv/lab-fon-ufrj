A solução mais interessante é transformar o próprio projeto em uma espécie de **"desktop CMS estático"**, ou, mais precisamente, em um **editor visual local que produz o site publicável**.

Isso, aliás, é bastante coerente com a arquitetura que você já construiu. O repositório já separa fonte de dados e apresentação por meio de `DataAdapter`/`JSONAdapter`, usa renderizadores de seção e mantém o conteúdo separado da implementação. Há inclusive um `WordPressAdapter` previsto, justamente como demonstração de que a fonte de dados pode ser substituída. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

A questão agora é **dar uma interface editorial muito melhor a essa arquitetura, sem abandonar o modelo de site estático**.

---

# 1. A restrição do servidor, na verdade, é uma vantagem arquitetural

Com o novo contexto, temos:

```text
Servidor PPGLEV
├── hospedagem compartilhada
├── FTP
├── sem root
├── sem Node
├── sem banco de dados
└── sem serviços auxiliares
```

Isso elimina ou torna desnecessariamente complexas as soluções:

- WordPress;
    
- Directus;
    
- Payload;
    
- Strapi;
    
- CMS headless hospedado;
    
- Next.js no servidor;
    
- qualquer aplicação com backend persistente.
    

Mas existe uma consequência muito interessante:

> **o site não precisa ser uma aplicação no servidor.**

Ele pode ser simplesmente um conjunto de arquivos estáticos.

E o seu projeto já está praticamente nessa direção.

O README deixa isso bastante claro: Vite é utilizado para produzir o build, o conteúdo está em `data.json`, os assets são locais e o resultado pode ser disponibilizado como arquivos. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Portanto, eu **não tentaria lutar contra a infraestrutura do PPGLEV**.

Eu a transformaria em uma característica deliberada:

> **o servidor é apenas o distribuidor dos arquivos publicados.**

Isso é extremamente robusto.

---

# 2. A ideia que você propõe é, na verdade, muito boa

Sua analogia com:

> baixar → editar → salvar → devolver ao repositório

é exatamente o modelo que eu adotaria.

Mas faria uma pequena alteração conceitual:

**não seria um editor de arquivos; seria um editor de projeto.**

O usuário não deveria saber que existe:

```text
data.json
```

Ele deveria enxergar:

```text
LABORATÓRIO DE FONÉTICA UFRJ

[Página inicial]
[Equipe]
[Pesquisas]
[Publicações]
[Parcerias]

                    [Editar]
```

E, internamente, o programa manipularia:

```text
content/
public/
config/
assets/
```

e produziria:

```text
dist/
```

---

# 3. Isso me leva a uma solução que considero superior ao editor de JSON original

Eu chamaria conceitualmente de:

## **Lab-FON Editor**

Um aplicativo Windows local.

Ele seria um **editor WYSIWYG/visual de conteúdo e estrutura**, mas especializado no modelo do site.

O fluxo seria:

```text
                COMPUTADOR DO EDITOR
                         │
                         ▼
              ┌────────────────────┐
              │   Lab-FON Editor   │
              │                    │
              │  conteúdo          │
              │  estrutura         │
              │  imagens           │
              │  preview           │
              └─────────┬──────────┘
                        │
                        ▼
                 validação/build
                        │
                        ▼
                    /dist
                        │
                        ▼
                      FTP
                        │
                        ▼
              SERVIDOR DO PPGLEV
```

E pronto.

Não há banco.

Não há API.

Não há login.

Não há servidor Node.

Não há Vercel.

Não há CMS externo.

---

# 4. E isso é mais "moderno" do que parece

Há uma tendência de associar "moderno" a:

> SaaS + cloud + API + banco + login.

Mas, para um site institucional pequeno, isso pode ser exatamente o contrário do que se deseja.

Um site estático gerado localmente possui algumas vantagens enormes:

- baixíssima superfície de ataque;
    
- nenhuma dependência de backend;
    
- excelente desempenho;
    
- grande longevidade;
    
- facilidade de backup;
    
- facilidade de migração;
    
- independência de fornecedor;
    
- funciona em praticamente qualquer hospedagem;
    
- o servidor pode continuar sendo o mesmo durante muitos anos.
    

Para o LabFonAc, eu diria que **static-first** é uma arquitetura particularmente adequada.

---

# 5. A grande mudança seria sair de "dados JSON" para "modelo de conteúdo"

Hoje o projeto tem:

```text
src/data.json
```

e o `JSONAdapter` o consome. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Eu manteria JSON, mas faria o usuário **não saber que está editando JSON**.

Por exemplo:

```text
content/
├── site.json
├── pages.json
├── researchers.json
├── publications.json
├── projects.json
└── partnerships.json
```

ou, dependendo da modelagem:

```text
content/
├── pages/
├── researchers/
├── publications/
├── projects/
└── partnerships/
```

O editor trabalha sobre esses dados através de formulários.

---

# 6. Mas você acrescentou uma exigência muito importante: editar a estrutura

Aqui eu faria uma mudança mais profunda.

O conteúdo não deveria ser simplesmente:

```json
{
  "title": "...",
  "text": "...",
  "image": "..."
}
```

A página deveria ser uma **árvore de blocos**.

Por exemplo:

```text
Página inicial
│
├── Hero
│
├── Texto
│
├── Pesquisadores
│
├── Destaque
│
├── Publicações
│
└── Parceiros
```

O editor permitiria:

**Adicionar bloco**

- Texto
    
- Imagem
    
- Galeria
    
- Pesquisadores
    
- Publicações
    
- Projeto
    
- Parceiros
    
- Vídeo
    
- Destaque
    
- Separador
    
- Colunas
    

E permitiria:

**↑ mover**

**↓ mover**

**duplicar**

**editar**

**remover**

Isso daria a liberdade estrutural que você está procurando.

---

# 7. Mas eu não faria um Elementor

Aqui está uma distinção que considero fundamental.

Não acho que o usuário leigo deva receber:

> uma tela branca na qual pode fazer absolutamente qualquer coisa.

Isso inevitavelmente degrada o design.

Em vez disso, eu faria um:

## **Block Editor com Design System fechado**

O usuário pode organizar:

```text
[Hero]
[Texto]
[Cards]
[Galeria]
[Publicações]
```

mas não pode arbitrariamente definir:

```text
font-size: 13.7px
margin-left: 43px
position: absolute
```

O **desenvolvedor controla os componentes**.

O **editor controla a composição**.

Essa divisão é excelente para manutenção.

---

# 8. E aqui o projeto atual já oferece uma base muito boa

Isso é algo que não estava claro na minha resposta anterior.

O repositório já tem uma abstração de:

> `SectionRenderer`

com ciclo de vida:

> `fetchData()` → `template()` → `afterRender()`

e estados de loading/error/empty/success. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Isso significa que a ideia de componentes/blocos **não precisa ser inventada do zero**.

O que existe hoje como:

```text
sections/
└── pesquisadores.js
```

poderia evoluir para:

```text
sections/
├── HeroSection.js
├── TextSection.js
├── ResearchersSection.js
├── PublicationsSection.js
├── ProjectsSection.js
├── PartnershipsSection.js
├── GallerySection.js
└── ContactSection.js
```

E o editor simplesmente manipularia a ordem dessas seções.

---

# 9. Eu faria uma separação ainda mais clara

Hoje existe uma distinção entre:

```text
JSON → Adapter → Renderer
```

Eu evoluiria para:

```text
CONTENT
   ↓
CONTENT MODEL
   ↓
PAGE BUILDER
   ↓
RENDERERS
   ↓
BUILD
   ↓
STATIC SITE
```

Ou seja:

### Content

O que o laboratório diz.

### Page Builder

Como o laboratório organiza esse conteúdo.

### Renderer

Como o desenvolvedor decidiu apresentar aquele tipo de conteúdo.

### Build

Transforma tudo em arquivos publicáveis.

---

# 10. O aplicativo Windows pode ser construído de maneira bastante simples

E aqui há uma decisão tecnológica interessante.

Eu **não criaria um programa Windows nativo em C#/.NET necessariamente**.

Você já está trabalhando com:

- JavaScript;
    
- Vite;
    
- módulos ES;
    
- testes;
    
- arquitetura modular.
    

O projeto já usa Node 18+ e Vite durante o desenvolvimento. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Portanto, uma solução natural seria transformar o editor em um aplicativo desktop com:

### Electron

ou, se quisermos algo mais leve:

### Tauri

Eu tenderia a considerar **Tauri**.

---

# 11. Por que Tauri seria particularmente interessante

O resultado seria algo como:

```text
Lab-FON Editor.exe
```

O usuário clica.

Abre:

```text
┌─────────────────────────────────────────────┐
│ Lab-FON Editor                              │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Páginas      │       PREVIEW                │
│              │                              │
│ Início       │       site real               │
│ Equipe       │                              │
│ Pesquisa     │                              │
│ Publicações  │                              │
│ Parcerias    │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

E, por baixo, o aplicativo manipula os arquivos do projeto.

Tauri permite empacotar uma aplicação web como aplicativo desktop, sem transformar o servidor de hospedagem em uma aplicação.

Isso é **perfeitamente compatível com seu cenário**.

---

# 12. E existe uma solução ainda mais simples

Antes de chegar a Tauri/Electron, eu faria uma pergunta:

> **o editor precisa realmente ser um `.exe`?**

Talvez não.

Poderíamos criar:

```text
editor.html
```

que roda localmente no navegador.

O usuário abre:

```text
Lab-FON Editor.html
```

e o editor funciona.

Entretanto, há limitações de segurança do navegador para:

- abrir diretórios;
    
- gravar arquivos;
    
- manipular FTP;
    
- acessar recursos locais.
    

Então, para uma experiência realmente fluida, o desktop wrapper acaba sendo melhor.

---

# 13. O FTP também pode ser incorporado ao aplicativo

E isso é justamente onde sua ideia fica muito elegante.

O usuário termina:

> **Salvar**

e o aplicativo pergunta:

> Publicar alterações no site?

[Cancelar] [Publicar]

Ao clicar:

```text
Validando conteúdo...
✓ JSON válido
✓ imagens encontradas
✓ links válidos
✓ campos obrigatórios preenchidos
✓ estrutura válida

Gerando site...
✓ 27 arquivos

Conectando ao servidor...
✓ FTP conectado

Enviando...
██████████████████ 100%

✓ Publicação concluída
```

O usuário nunca vê FTP.

Ele vê:

> **Publicar site.**

Essa diferença de UX é enorme.

---

# 14. E eu acrescentaria uma função ainda mais importante: "Ver antes de publicar"

O fluxo deveria ser:

```text
Editar
  ↓
Salvar
  ↓
Visualizar
  ↓
Validar
  ↓
Publicar
```

O aplicativo poderia abrir o site localmente em:

```text
http://localhost:xxxxx
```

e mostrar exatamente o que será publicado.

Só depois:

> **Publicar no site**

Isso praticamente elimina a necessidade de o usuário entender o processo técnico.

---

# 15. Há outra vantagem: publicação atômica

Eu faria o FTP trabalhar de maneira cuidadosa.

Não simplesmente:

```text
upload index.html
upload data.json
upload imagem1
upload imagem2
...
```

porque uma interrupção no meio pode deixar o site inconsistente.

O aplicativo deveria gerar um conjunto completo de publicação e enviar os arquivos de maneira controlada.

Idealmente:

```text
BUILD
 ↓
VALIDATE
 ↓
PACKAGE
 ↓
UPLOAD
 ↓
VERIFY
```

E manter localmente:

```text
backups/
├── 2026-08-26-1030/
├── 2026-09-03-1422/
└── 2026-09-17-0915/
```

Assim o editor poderia inclusive ter:

> **Restaurar versão anterior**

---

# 16. E aqui aparece uma solução muito interessante para o Git

Eu **não eliminaria Git do projeto**.

Mas faria uma separação:

```text
GitHub
│
├── código-fonte
├── componentes
├── estilos
├── editor
├── schemas
└── documentação
```

Enquanto o conteúdo editorial poderia ser tratado separadamente.

Mas há uma alternativa ainda melhor:

## manter também um repositório de conteúdo

O editor poderia trabalhar com:

```text
lab-fon-content/
```

e fazer:

```text
pull
 ↓
editar
 ↓
validar
 ↓
commit
 ↓
push
```

**automaticamente**, sem o usuário precisar saber o que Git é.

---

# 17. Isso transforma Git numa espécie de "controle de versões invisível"

O usuário vê:

> **Versões**

```text
Hoje — 10:43
"Atualização da equipe"

Ontem — 16:21
"Nova publicação"

12/08/2026
"Atualização da página inicial"
```

Enquanto, por trás:

```text
git commit
git diff
git restore
```

continua preservando o histórico.

Isso seria particularmente valioso em um ambiente acadêmico.

---

# 18. Porém, eu não faria o FTP depender do GitHub

São coisas diferentes.

O fluxo poderia ser:

```text
                 GitHub
                   │
              código-fonte
                   │
                   ▼
             desenvolvedor
                   │
                   ▼
             versão do Editor
                   │
                   ▼
             usuário leigo
                   │
          ┌────────┴─────────┐
          │                  │
       conteúdo             build
          │                  │
          └────────┬─────────┘
                   ▼
                  FTP
                   │
                   ▼
               PPGLEV
```

O usuário final não precisa sequer ter uma conta GitHub.

---

# 19. E isso resolve o problema que você levantou originalmente

Você queria preservar:

> **integridade do conteúdo.**

Mas agora podemos preservar **três integridades diferentes**.

### Integridade estrutural

O editor só permite estruturas válidas.

### Integridade semântica

O schema verifica:

- campos obrigatórios;
    
- tipos;
    
- URLs;
    
- datas;
    
- referências;
    
- imagens.
    

### Integridade visual

O editor só oferece componentes previamente definidos.

Isso é muito melhor do que simplesmente impedir que alguém quebre a sintaxe do JSON.

---

# 20. Eu introduziria JSON Schema

Essa seria uma peça importante da arquitetura.

Por exemplo:

```text
researcher.schema.json
publication.schema.json
page.schema.json
project.schema.json
```

O programa valida os dados antes de gerar o site.

Então, se alguém tentar publicar:

```text
Pesquisador
Nome: [vazio]
```

o programa responde:

> ⚠ Nome é obrigatório.

Se colocar:

> ORCID: `banana`

> ⚠ URL/identificador inválido.

Isso é uma barreira de segurança muito mais elegante.

---

# 21. E o mesmo vale para imagens

O editor poderia verificar:

- arquivo existe;
    
- formato permitido;
    
- tamanho;
    
- dimensões mínimas;
    
- nome de arquivo;
    
- imagem órfã;
    
- imagem não utilizada.
    

E até fazer:

> **Otimizar imagens automaticamente**

antes do upload.

Isso é especialmente interessante porque o usuário leigo provavelmente não deveria ter de aprender:

> "JPEG 85%, WebP, dimensões responsivas etc."

---

# 22. O editor poderia até possuir uma "biblioteca de mídia"

Algo como:

```text
Mídia

[Foto 1] [Foto 2] [Foto 3]
[Foto 4] [Foto 5] [Foto 6]

+ Adicionar imagem
```

Ao escolher uma imagem:

> Nome: Maria Silva  
> Texto alternativo: "Maria Silva no laboratório"  
> Uso: Pesquisadora

Isso melhora bastante acessibilidade.

O projeto já demonstra preocupação com WCAG 2.1 AA, HTML semântico, ARIA, navegação por teclado e contraste. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub")) Eu manteria essa preocupação **também no editor**, não apenas no site publicado.

---

# 23. E eu mudaria uma coisa importante no roadmap atual

O roadmap atual prevê:

> "Implementar WordPressAdapter"

e depois:

> "Painel administrativo". ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Dadas as restrições que você acabou de informar, **eu retiraria o WordPressAdapter da prioridade**.

Ele é uma demonstração interessante do Adapter Pattern, mas deixa de ser uma direção arquitetural relevante.

Em seu lugar:

### Nova Phase 2

**Content Model + Schema + Editor**

### Nova Phase 3

**Visual Page Builder + Preview**

### Nova Phase 4

**Desktop Packaging + FTP Deployment**

Isso teria muito mais aderência ao ambiente real.

---

# 24. E eu faria uma mudança conceitual no nome do "painel administrativo"

Não o chamaria de:

> Painel administrativo.

Isso sugere um backend.

Eu chamaria:

> **Editor do site**

ou:

> **Lab-FON Website Editor**

Porque ele não administra um servidor.

Ele **edita e publica um artefato estático**.

Essa distinção é importante.

---

# 25. A arquitetura final que eu recomendaria

Eu chegaria a isto:

```text
                    DESENVOLVEDOR
                         │
                         ▼
                 ┌───────────────┐
                 │ GitHub        │
                 │               │
                 │ código        │
                 │ componentes   │
                 │ schemas       │
                 │ editor        │
                 └───────┬───────┘
                         │
                         ▼
                  Lab-FON Editor
                    (.exe)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Conteúdo       Estrutura       Mídia
       JSON/schema    da página       imagens
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                      Preview
                         │
                         ▼
                     Validação
                         │
                         ▼
                       Build
                         │
                         ▼
                       FTP
                         │
                         ▼
                 ┌────────────────┐
                 │ PPGLEV         │
                 │ hospedagem     │
                 │ estática       │
                 └────────────────┘
```

Isso, para mim, é **muito mais adequado ao projeto do que CMS headless**.

---

# 26. E há uma consequência muito boa para a manutenção futura

Suponha que daqui a quatro anos ninguém mais saiba como o site foi feito.

Se existir:

```text
Lab-FON Editor.exe
```

e o projeto tiver documentação adequada, a pessoa responsável poderá simplesmente:

> abrir o projeto → editar → visualizar → publicar.

Não precisa saber:

- Node;
    
- npm;
    
- Vite;
    
- Git;
    
- JSON;
    
- FTP;
    
- JavaScript.
    

Enquanto o desenvolvedor que assumir o projeto poderá abrir o GitHub e encontrar:

```text
src/
schemas/
editor/
tests/
docs/
```

e trabalhar tecnicamente.

**As duas camadas ficam independentes.**

---

# 27. Há, portanto, uma mudança de paradigma em relação à minha primeira resposta

Minha primeira recomendação era aproximadamente:

> **CMS → API → front-end → servidor**

Com as novas informações, eu a substituiria por:

> **Editor desktop → build estático → FTP → hospedagem**

E isso não é uma solução "menos moderna".

Na verdade, para esse caso específico, eu diria que é **arquiteturalmente mais apropriada**.

Você está construindo um **site institucional estático com conteúdo estruturado**, não uma aplicação web que precisa de backend.

O CMS headless resolveria um problema que a infraestrutura disponível deliberadamente não quer resolver.

---

# 28. Minha recomendação definitiva

Eu seguiria este caminho:

### **Não abandonar o JSON.**

Abandonar **o JSON como interface**.

### **Não abandonar o Vite.**

Ele continua sendo o mecanismo de build. O projeto já está estruturado para isso. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

### **Não criar um backend.**

O servidor PPGLEV permanece puramente estático.

### **Não usar Vercel.**

Não há necessidade.

### **Não usar WordPress.**

A infraestrutura e o objetivo não justificam.

### **Criar um editor desktop Windows.**

Preferencialmente Tauri, aproveitando a base JavaScript existente.

### **Criar um modelo de conteúdo formal.**

JSON + JSON Schema.

### **Criar um Page Builder restrito a componentes.**

O usuário controla a composição, não o código.

### **Criar preview local.**

O que aparece no preview é o que será publicado.

### **Criar validação antes do deploy.**

Nada inválido chega ao servidor.

### **Integrar FTP ao botão "Publicar".**

FTP deixa de ser uma operação técnica.

### **Manter Git/GitHub para o desenvolvimento.**

E, se desejável, usar controle de versões também para o conteúdo, mas de forma transparente ao usuário.

---

E há um ponto que considero particularmente promissor: **o repositório já possui exatamente as abstrações que tornam essa evolução relativamente natural**. O `DataAdapter`, o `JSONAdapter`, os `SectionRenderer`s, a separação entre `content`, `src`, `public`, os testes e a preocupação explícita com segurança/acessibilidade não são coisas que eu descartaria; ao contrário, eu as trataria como o **núcleo técnico sobre o qual construiria o editor**. ([GitHub](https://github.com/Wisleyv/lab-fon-ufrj "GitHub - Wisleyv/lab-fon-ufrj: Website do Laboratório de Fonética da UFRJ · GitHub"))

Em outras palavras, eu não substituiria o projeto por uma plataforma externa. **Eu transformaria o projeto que você já tem em uma pequena plataforma editorial autônoma.**

E, olhando especificamente para o seu cenário, acho que essa é uma solução mais elegante do que a que eu havia proposto inicialmente.