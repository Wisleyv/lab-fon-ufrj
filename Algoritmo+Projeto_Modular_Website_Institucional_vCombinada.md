# Algoritmo Modular para o Website Institucional — Laboratório de Fonética (vFINAL)

**Projeto:** Website Institucional — Laboratório de Fonética da UFRJ  
**Autor:** Arquiteto Sênior (documento técnico consolidado)  
**Data:** 2025-10-10

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Objetivos e Princípios de Arquitetura](#objetivos-e-princípios-de-arquitetura)
3. [Visão Geral do Algoritmo Modular (fluxo)](#visão-geral-do-algoritmo-modular-fluxo)
4. [Estrutura de Ficheiros e Convenções](#estrutura-de-ficheiros-e-convenções)
5. [Skeleton HTML de referência](#skeleton-html-de-referência)
6. [Conteúdo em `data.json` — esquema e exemplos](#conteúdo-em-datajson--esquema-e-exemplos)
7. [main.js — pseudocódigo e responsabilidades dos módulos](#mainjs--pseudocódigo-e-responsabilidades-dos-módulos)
8. [Componentes e exemplos de renderização (cards, listas)](#componentes-e-exemplos-de-renderização-cards-listas)
9. [Estilos (CSS) — abordagem Mobile-First e Breakpoints](#estilos-css--abordagem-mobile-first-e-breakpoints)
10. [Interatividade e Acessibilidade](#interatividade-e-acessibilidade)
11. [Boas práticas de performance e otimização de assets](#boas-práticas-de-performance-e-otimização-de-assets)
12. [Teste, Validação e Checklist de QA](#teste-validação-e-checklist-de-qa)
13. [Deploy e Checklist de Produção](#deploy-e-checklist-de-produção)
14. [Evolução futura / Migração para CMS (WordPress) e API Mapping]
15. [Guia completo passo-a-passo para cadastro e gestão do projeto no ProjeQtOr]
16. [Mapeamento detalhado de tarefas, horas e custos (Tabela — conforme Excerto)]
17. [Milestones e Cronograma resumido (30 dias)]
18. [Manutenção e instruções de atualização de conteúdo]
19. [Apêndices: snippets e exemplos (`index.html`, `data.json`, `main.js`, CSS`)]

---

## 1. Visão Geral

Documento consolidado que reúne os pontos fortes das versões `v.1` e `v.1.1` e o texto-base da proposta orçamentária ("Excerto"), propondo uma solução modular, prática e pronta para uso.

O objetivo técnico-prático: produzir um website institucional de **página única** (single page), de preferência estático (HTML/CSS/JS) com dados externalizados (JSON) — garantindo manutenção simples, documentação clara e possibilidade de evolução (migração para CMS, adição de funcionalidades, internacionalização, etc.).

Referência de conteúdo: estrutura em 6 seções conforme proposta original.

---

## 2. Objetivos e Princípios de Arquitetura

- **Separação de responsabilidades**: HTML (estrutura), CSS (apresentação), JS/JSON (conteúdo e lógica).
- **Modularidade**: cada seção é um módulo independente (renderização, templates e dados).
- **Manutenibilidade**: atualizar conteúdo sem tocar no código (editar `data.json`).
- **Evolução**: fácil migração para CMS (a mesma lógica de consumir dados via API se aplica).
- **Acessibilidade e Performance**: incorporar ARIA, semantic HTML, lazy-loading e otimização de assets.

---

## 3. Visão Geral do Algoritmo Modular (fluxo)

1. **INIT** — `index.html` carregado no browser; placeholders `<section id="...">` prontos.
2. **DATA LOADER** — `main.js` executa `fetch('data.json')` (ou endpoint equivalente) para obter conteúdo.
3. **RENDERER** — `renderPage(data)` itera sobre seções e chama `render<SectionName>(data.section)`.
4. **COMPONENTS** — funções/componentes pequenos para gerar HTML (cards, itens de lista, logos).
5. **INTERACTIVITY** — `initializeInteractivity()` (menu, scroll suave, colapsáveis, acessibilidade).
6. **POSTPROCESS** — lazy-loading de imagens, registro de analytics, final checks.

Este pipeline permite adicionar uma nova secção apenas incluindo a entrada no `data.json` + criando a função `renderNovaSecao()` e chamando-a no `renderPage()` — sem alteração do restante da aplicação.

---

## 4. Estrutura de Ficheiros e Convenções

Sugestão mínima de estrutura:

```
/ (raiz do projeto)
├─ index.html
├─ README.md
├─ data.json
├─ assets/
│  ├─ images/
│  └─ logos/
├─ css/
│  ├─ main.css
│  └─ normalize.css
├─ js/
│  ├─ main.js
│  └─ components.js
└─ dist/ (opcional para build minificado)
```

**Convenções**:

- IDs de sections em `index.html` usam nomes simples e em português: `#coordenacao`, `#colaboradores`, `#pesquisadores`, `#trabalhos`, `#links`, `#parcerias`.
- `data.json` centraliza todo o conteúdo textual e URLs.
- Assets (imagens) armazenadas em `/assets/images/` e referenciadas com caminhos relativos.

---

## 5. Skeleton HTML de referência

> **Nota:** este `index.html` é uma base semântico-funcional. Não contém o CSS final nem todos os atributos de acessibilidade, que devem ser aplicados conforme design.

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Laboratório de Fonética — UFRJ</title>
    <link rel="stylesheet" href="css/main.css" />
  </head>
  <body>
    <header>
      <div class="container">
        <a class="logo" href="#">Lab. de Fonética — UFRJ</a>
        <nav id="main-nav"></nav>
        <button id="menu-toggle" aria-expanded="false">Menu</button>
      </div>
    </header>

    <main>
      <section id="coordenacao" aria-labelledby="h-coordenacao"></section>
      <section id="colaboradores" aria-labelledby="h-colaboradores"></section>
      <section id="pesquisadores" aria-labelledby="h-pesquisadores"></section>
      <section id="trabalhos" aria-labelledby="h-trabalhos"></section>
      <section id="links" aria-labelledby="h-links"></section>
      <section id="parcerias" aria-labelledby="h-parcerias"></section>
    </main>

    <footer>
      <div class="container">
        <p>© Laboratório de Fonética — UFRJ</p>
      </div>
    </footer>

    <script src="js/main.js" defer></script>
  </body>
</html>
```

---

## 6. Conteúdo em `data.json` — esquema e exemplos

**Esquema sugerido** (JSON):

```json
{
  "coordenacao": [
    { "nome": "Prof. Fulano de Tal", "cargo": "Coordenador", "foto": "assets/images/fulano.jpg", "lattes": "https://lattes.cnpq.br/...", "email": "fulano@ufrj.br", "bio": "Resumo curto..." }
  ],
  "colaboradores": [...],
  "pesquisadores": [...],
  "trabalhos": [
    { "titulo": "Título do trabalho", "autores": "Fulano; Ciclano", "ano": 2023, "veiculo": "Revista X", "link": "assets/papers/paper.pdf" }
  ],
  "links": [
    { "nome": "Grupoprovale - Contato", "url": "https://sites.google.com/view/grupoprovale/contato" }
  ],
  "parcerias": [
    { "nome": "Universidade Y", "logo": "assets/logos/uni-y.png", "url": "https://uni-y.edu" }
  ]
}
```

**Boas práticas para o `data.json`**:

- Use **UTF-8** e evite comentários no JSON (usar um arquivo `README.md` para documentação).
- Mantenha IDs únicos para entradas que serão linkadas.
- Armazene apenas conteúdo; qualquer lógica de apresentação deve ficar em JS/CSS.

---

## 7. `main.js` — pseudocódigo e responsabilidades dos módulos

**Pseudocódigo simplificado (estrutura clara)**:

```js
async function fetchContent() {
  const res = await fetch("data.json");
  const data = await res.json();
  renderPage(data);
  initializeInteractivity();
}

function renderPage(data) {
  renderCoordenacao(data.coordenacao);
  renderColaboradores(data.colaboradores);
  renderPesquisadores(data.pesquisadores);
  renderTrabalhos(data.trabalhos);
  renderLinks(data.links);
  renderParcerias(data.parcerias);
}

function renderPesquisadores(list) {
  const container = document.getElementById("pesquisadores");
  container.innerHTML = "";
  list.forEach((p) => container.appendChild(createResearcherCard(p)));
}

function createResearcherCard(p) {
  const card = document.createElement("article");
  card.className = "card pesquisador";
  card.innerHTML = `...`;
  return card;
}

function initializeInteractivity() {
  setupSmoothScroll();
  setupMenuToggle();
  setupKeyboardNav();
}

// inicialização
document.addEventListener("DOMContentLoaded", fetchContent);
```

**Observações**:

- Prefira `defer` no script (`<script defer src="js/main.js"></script>`) para garantir parsing do HTML primeiro.
- Trate erros de fetch com fallback (ex: mensagem de "Conteúdo indisponível").

---

## 8. Componentes e exemplos de renderização (cards, listas)

**Exemplo de template (string template)**:

```js
function createResearcherInnerHTML(p) {
  return `
    <img src="${p.foto}" alt="Foto de ${p.nome}" loading="lazy">
    <h3>${p.nome}</h3>
    <p class="cargo">${p.cargo}</p>
    <p class="bio">${p.bio}</p>
    <p class="links">
      <a href="${p.lattes}" target="_blank" rel="noopener">Lattes</a>
      <a href="mailto:${p.email}">Email</a>
    </p>
  `;
}
```

**Pontos importantes**:

- Use `loading="lazy"` para imagens não-críticas.
- Inclua `alt` descritivo em todas as imagens.
- Evite `innerHTML` com conteúdo não-sanitizado; se o conteúdo vem de fontes externas, sanitize antes.

---

## 9. Estilos (CSS) — abordagem Mobile-First e Breakpoints

**Princípios**:

- Desenvolver estilos básicos para mobile primeiro.
- Usar `rem` e `em` para tipografia responsiva.
- Grid/Flexbox para layout de cards.

**Breakpoints sugeridos**:

- `min-width: 640px` (pequenos tablets)
- `min-width: 768px` (tablets)
- `min-width: 1024px` (desktops)

**Pequeno snippet**:

```css
/* mobile base */
.container {
  padding: 1rem;
}
.card {
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

@media (min-width: 768px) {
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}
```

---

## 10. Interatividade e Acessibilidade

**Acessibilidade**:

- Marcação semântica (`<main>`, `<section>`, `<article>`, `<nav>`).
- `aria-labelledby` para cada section.
- `alt` em imagens; `aria-expanded` em botões de menu.
- Garantir foco acessível (outline visível) e navegação via teclado.

**Interatividade**:

- Rolagem suave para navegação interna com `scrollIntoView({behavior: 'smooth'})`.
- Menu responsivo com `aria-expanded` toggle.
- Expand/collapse para listas longas (ex: publicações), com `aria-controls`.

---

## 11. Boas práticas de performance e otimização de assets

- **Compressão:** gzip / Brotli no servidor.
- **Minificação:** CSS e JS antes do deploy.
- **Cache:** TTL para assets estáticos com versionamento (`/dist/main.v1.0.css`).
- **Imagens:** converter para WebP/AVIF quando possível; usar `srcset` para múltiplas resoluções.
- **Critical CSS:** inline do CSS crítico para primeira dobra (opcional).
- **Lazy-loading** para imagens e iframes.
- **Audit:** rodar Lighthouse e corrigir problemas de performance.

---

## 12. Teste, Validação e Checklist de QA

**Checklist mínimo**:

- [ ] Testes em Chrome, Firefox, Safari (desktop e mobile).
- [ ] Testes em iOS (Safari) e Android (Chrome).
- [ ] Verificação de responsividade (320px, 375px, 425px, 768px, 1024px).
- [ ] Validação de links e downloads (ex: PDFs).
- [ ] Testes de contraste de cor (WCAG AA).
- [ ] Navegação somente por teclado.
- [ ] Verificação de formulários (se houver) e sanitização.

---

## 13. Deploy e Checklist de Produção

**Pré-deploy**:

- Confirmar que identidade visual e conteúdo (data.json) foram entregues.
- Testar no ambiente staging (ou local com servidor).

**Server checks (mínimos)**:

- Servidor aceita arquivos estáticos (HTML/CSS/JS).
- Caso PHP seja necessário, confirmar versão suportada.
- Certificado HTTPS (Let's Encrypt).
- Configurar headers de cache e compressão.

**Checklist de deploy**:

- [ ] Fazer backup da versão anterior (se houver).
- [ ] Subir arquivos e validar paths.
- [ ] Testar links e downloads em produção.
- [ ] Ativar monitoramento (ex: UptimeRobot).

---

## 14. Evolução futura / Migração para CMS (WordPress) e API Mapping

**Racional**: a arquitetura com `data.json` facilita a substituição da fonte de dados por uma API REST (WordPress REST API, headless CMS, etc.).

**Mapeamento básico**:

- `coordenacao`, `colaboradores`, `pesquisadores` → custom post type `membros` (ou `pesquisadores`) com campos ACF (foto, cargo, lattes, bio).
- `trabalhos` → custom post type `publicacoes` (titulo, autores, ano, arquivo).
- `links` e `parcerias` → taxonomias ou CPTs simples.

**Troca de fonte no `main.js`**:

- Em vez de `fetch('data.json')`, fazer `fetch('https://seusite/wp-json/wp/v2/pesquisadores')` e mapear o formato.

---

## 15. Guia completo passo-a-passo para cadastro e gestão do projeto no ProjeQtOr

**Passo 1: Criar novo projeto**

- Menu: Projetos → Novo.
- Nome: `Website Institucional - Laboratório de Fonética UFRJ`.
- Código/ID: `UFRJ-FONETICA-WEB-2025`.
- Cliente: Laboratório de Fonética da UFRJ.
- Tipo: `Time and Materials` (ou similar).
- Datas: definir data de início e fim (30 dias).

**Passo 2: Estruturar EAP / WBS**

- Inserir atividades-pai: `1.0 Planejamento`, `2.0 Design`, `3.0 Desenvolvimento`, `4.0 Testes`, `5.0 Ajustes e Deploy`, `6.0 Gestão`.
- Para cada atividade-pai, criar sub-tarefas com horas (ver tabela abaixo).

**Passo 3: Marcos e dependências**

- Criar marcos (M1, M2, M3) e vincular a conclusão de determinadas atividades.
- Definir predecessoras nas tarefas para gerar cronograma realista.

**Passo 4: Recursos e custos**

- Cadastrar recurso(s) (Desenvolvedor Web Pleno).
- Definir custo/hora: R$ 80,00.
- Atribuir recursos às tarefas com horas previstas; ProjeQtOr calculará custos.

**Passo 5: Acompanhamento**

- Uso de tickets/bugs para ajustes; apontamento de horas;
- Atualizar status das tarefas periodicamente para alimentar dashboards.

---

## 16. Mapeamento detalhado de tarefas, horas e custos (Tabela — conforme _Excerto_)

| **Etapa**                    |                                        **Tarefa** | **Horas Estimadas** | **Subtotal (R$)** |
| ---------------------------- | ------------------------------------------------: | ------------------: | ----------------: |
| 1. Planejamento e Estratégia |                 Reunião de alinhamento (Briefing) |                  1h |          R$ 80,00 |
|                              | Análise de requisitos / Arquitetura da informação |                  4h |         R$ 320,00 |
| 2. Design (Adaptação UI/UX)  |                              Criação do wireframe |                  6h |         R$ 480,00 |
|                              |  Mockup alta fidelidade (aplicação da identidade) |                  6h |         R$ 480,00 |
|                              |                 Reunião de apresentação do design |                  1h |          R$ 80,00 |
| 3. Desenvolvimento Front-end |   Configuração do ambiente / Estrutura do projeto |                  3h |         R$ 240,00 |
|                              |                       Codificação HTML5 semântico |                 10h |         R$ 800,00 |
|                              |           Estilização CSS3 (fidelidade ao design) |                 12h |         R$ 960,00 |
|                              |                   Implementação de responsividade |                 12h |         R$ 960,00 |
|                              |            Interatividade JS (menu, scroll, etc.) |                  3h |         R$ 240,00 |
| 4. Testes e Validação        |                 Testes compatibilidade (browsers) |                  2h |         R$ 160,00 |
|                              |                          Testes de responsividade |                  2h |         R$ 160,00 |
|                              |  Verificação de links e revisão final de conteúdo |                  2h |         R$ 160,00 |
| 5. Ajustes e Implementação   |                Rodada final de ajustes (feedback) |                  4h |         R$ 320,00 |
|                              |                Implementação no servidor (deploy) |                  3h |         R$ 240,00 |
|                              |                     Verificação final em produção |                  1h |          R$ 80,00 |
| Gestão e Comunicação         |                          Gerenciamento do projeto |                  3h |         R$ 240,00 |
| **TOTAL**                    |                                                   |        **75 horas** |   **R$ 6.000,00** |

> **Observação:** Os valores e horas acima são idênticos aos informados no Excerto da proposta orçamentária (Rev.1).

---

## 17. Milestones e Cronograma resumido (30 dias)

- **Semana 1:** Planejamento e Design — Wireframe + Mockup aprovados (M1).
- **Semanas 2–3:** Desenvolvimento Front-end (M2 ao final da semana 3).
- **Semana 4:** Testes, ajustes finais e Deploy (M3 — Go-live).

**Milestones**:

- M1 — Mockup de Alta Fidelidade Aprovado (fim da Semana 1).
- M2 — Ambiente de Desenvolvimento + Versão Alfa Concluída (fim da Semana 3).
- M3 — Site publicado (Go-live) (fim da Semana 4).

---

## 18. Manutenção e instruções de atualização de conteúdo

**Editar conteúdo**:

- Para adicionar/editar pesquisador: atualizar `data.json` → committed no repositório → fazer deploy.
- Para adicionar publicação: colocar arquivo em `assets/papers/` e adicionar entrada em `data.json.trabalhos` com `link` apontando para o arquivo.

**Rotina recomendada**:

- Backup semanal do diretório `/assets/` e `data.json`.
- Versões no Git (branch `main` / `dev`) para controle.
- Registro de mudanças em `CHANGELOG.md`.

---

## 19. Apêndices — snippets e exemplos completos

### 19.1 `index.html` (resumido)

> O `index.html` completo foi incluído na secção 5 (skeleton). Recomenda-se adicionar meta tags de SEO e Open Graph.

### 19.2 `data.json` (exemplo mínimo)

```json
{
  "coordenacao": [
    {
      "nome": "Prof. Fulano",
      "cargo": "Coordenador",
      "foto": "assets/images/fulano.jpg",
      "lattes": "https://...",
      "email": "fulano@ufrj.br",
      "bio": "..."
    }
  ],
  "pesquisadores": [],
  "trabalhos": [],
  "links": [],
  "parcerias": []
}
```

### 19.3 `main.js` (esqueleto)

```js
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("data.json");
    const data = await resp.json();
    renderPage(data);
    initializeInteractivity();
  } catch (err) {
    console.error("Falha ao carregar conteúdo:", err);
    document.getElementById("main").innerHTML =
      "<p>Conteúdo temporariamente indisponível.</p>";
  }
});
```

### 19.4 Pequena checklist de migração para WordPress (heads-up)

- Criar CPTs (`pesquisadores`, `publicacoes`), usar ACF para campos extras.
- Mapear cada `data.json` → endpoint WP (JSON).
- Ajustar `main.js` para consumir a API do WP e normalizar nomes de campos.

---

## Referências e notas finais

- Texto-base: Proposta orçamentária (Excerto).
- Estrutura e conteúdos inspirados no exemplo: https://sites.google.com/view/grupoprovale/contato

---

> **Observação final:** este ficheiro (vFINAL) foi construído para integrar o conteúdo das versões `v.1` e `v.1.1` e os itens do Excerto. Inclui: algoritmo modular, pseudocódigo, esquema `data.json`, skeleton HTML, WBS/EAP com horas e custos, cronograma e checklist de deploy e QA.
