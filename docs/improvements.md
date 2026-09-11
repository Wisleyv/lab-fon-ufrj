Yes. This is a good point to shift from “make it work” to “make it understandable and pleasant to use.” The important constraint is that the production workflow is already functioning, so the next phase should **refine the interface and content without reopening the infrastructure**.

One limitation up front: I tried to inspect the live LabFonAc URL directly, but my browser connector could not retrieve that subpage at the moment. I therefore won’t pretend I performed a pixel-level live audit. The plan below is grounded in the current production state from our work, your description of what you see, the attached meeting brief, and the parts of the institutional PPGLEV site that are accessible.

## 1. How the new requests compare with the original brief

Several of the changes are actually the completion of requirements already present in the August meeting notes rather than new scope. The brief explicitly called for a larger-at-first logo, inclusion of CNPq, PROVALE social integration and its presentation text, and coordination information in the footer.   

There are two useful refinements in your current request. First, the earlier document treated João Moraes as a separate “Fundador” category and then listed the docentes; you now want a single docentes presentation in which João comes first with the label **Fundador**, followed by the remaining docentes alphabetically.  I would treat your current instruction as superseding the older presentation rule.

Second, the earlier specification merely asked for integration with the project's social network. Your new requirement is much more actionable: the editor should accept Instagram embed information/code rather than just storing descriptive text. 

The PROVALE paragraph itself should be inserted as supplied rather than rewritten by the agent. 

---

# 2. The editor needs an information-architecture change, not merely new styling

I agree with your diagnosis of the current single-page editor. A long vertical control panel was defensible while the application was being built incrementally; it is not the ideal mental model for a nontechnical maintainer.

I would replace it with a **six-stage tabbed workflow**:

| Tab             | Purpose                                              | Initially usable?       |
| --------------- | ---------------------------------------------------- | ----------------------- |
| **1. Conectar** | Server/profile connection                            | Yes                     |
| **2. Projeto**  | Retrieve the latest `/source/` project               | After connection        |
| **3. Conteúdo** | Edit Site, Equipe, Linhas, Parcerias, Extensão, etc. | After retrieval         |
| **4. Página**   | Add/remove/reorder sections                          | After retrieval         |
| **5. Revisar**  | Build and preview                                    | After valid save        |
| **6. Publicar** | Update source / publish site                         | After successful review |

All six tabs should **always be visible**. A future tab should not disappear; instead its controls remain disabled with a short explanation such as:

> “Para editar o conteúdo, primeiro conecte-se ao servidor e abra a versão atual do projeto.”

That gives the user a map of the process without letting them perform operations out of sequence.

Technically, I would *not* create another workflow engine. The application already tracks connection, project, draft, build and publication state. Derive tab availability from those existing states.

A compact status strip would also help enormously:

```text
Servidor: conectado
Projeto: versão remota aberta
Alterações locais: 2
Projeto remoto: não atualizado
Site: ainda não publicado
```

That addresses the more fundamental problem you identified: the user currently has difficulty knowing **what has happened and what remains to happen**.

---

# 3. Portuguese guidance should be part of every stage

I would avoid a complicated tutorial/onboarding system. It costs development time and users tend not to revisit it.

Instead, every tab should have three short pieces of microcopy:

**O que você faz aqui**
One or two sentences.

**O que acontece depois**
Explains the consequence of Save / Update / Publish.

**Ajuda**
A `?` button opening a small contextual help panel.

For example, `Publicar` needs to say very plainly that:

```text
Salvar
≠
Atualizar projeto remoto
≠
Publicar site
```

This distinction is obvious to us now, but absolutely not obvious to the intended user.

Tooltips can supplement this, but they should not contain essential instructions: they are poor on touch devices and easy to miss.

---

# 4. “Abrir projeto” should cease to be part of the normal path

I agree completely.

The ordinary path should be:

```text
Conectar
→ Obter versão atual do site
→ Editar
→ Revisar
→ Publicar
```

The Windows file picker belongs under something like:

**Opções avançadas → Abrir projeto local**

with explanatory text:

> “Use somente para trabalhar com uma cópia local ou recuperar um projeto. Normalmente, escolha ‘Obter versão atual’.”

Do not remove the feature; it is useful for development/recovery. Just demote it from the primary workflow.

---

# 5. Creating genuinely new sections is the one substantial architectural addition

This requires some care.

At present, “Adicionar seção” effectively means **enable a renderer that already exists**. That is why only previously defined sections appear.

I would not solve that by allowing arbitrary HTML and CSS. For a nontechnical maintainer that would eventually destroy the very reliability we have spent so much effort building.

Instead, introduce one **generic custom-section type**.

Conceptually:

```text
section
├── title
├── navigation label
├── id/slug
├── enabled
├── layout
└── blocks[]
```

The editor could offer a small palette of blocks:

```text
Título
Texto
Imagem
Lista
Link/botão
Incorporação
```

and perhaps three layouts:

```text
Texto
Conteúdo amplo
Cartões
```

A new section therefore becomes genuinely new — new title, content, order and navigation entry — without requiring a new JavaScript renderer every time.

Under the hood, one `GenericSectionRenderer` renders all such sections.

This is a very good compromise between **freedom and regression resistance**.

---

# 6. Section placement

Once a section is created or enabled, the editor should immediately ask:

**Onde inserir?**

For example:

```text
Após: Linhas de Pesquisa ▼
```

Existing move-up/move-down controls can remain afterward.

I would **not implement drag-and-drop now**. It costs more to implement accessibly, adds edge cases, and does little that “Inserir após…” plus move controls cannot accomplish.

---

# 7. Instagram: accept the embed, but don't store arbitrary executable HTML

Your request can be met without opening the site to arbitrary scripts.

The editor could offer:

**Instagram**

```text
URL ou código de incorporação
[                                       ]
```

When an official Instagram embed snippet is pasted, the editor should parse it and retain the permitted Instagram information rather than blindly saving every `<script>` element supplied by the clipboard.

The renderer can then generate the permitted Instagram embed markup and load Instagram's `embed.js` **once per page**.

Meta's current embed implementation itself follows this general pattern: Instagram post, reel and profile embeds use the Instagram embed SDK, and the script is deduplicated rather than being repeatedly inserted for every embed. ([GitHub][1])

I would actually accept **both**:

```text
Instagram URL
or
official pasted embed code
```

The former will be much easier for the intended maintainer.

No backend/API integration is necessary.

---

# 8. Website changes

### Logo/header

The present “slightly larger” effect undershoots the requirement. The original notes explicitly say to enlarge it initially and reduce it afterward. 

I would target approximately:

```text
top state:     1.35–1.45 × current compact logo
scrolled:      current logo size
```

not merely `1.1×`.

The header itself should accommodate this instead of visually scaling the logo over neighboring elements. The safest approach is:

```text
expanded header
→ larger real logo dimensions
→ slightly more vertical padding

scrolled header
→ compact logo
→ compact padding
```

with a short CSS transition.

Use responsive `clamp()` limits rather than hard coding one desktop width, and retain a smaller maximum on phones.

That gives the logo genuine visual hierarchy without causing it to overlap navigation.

---

### Footer

The attached specification requires institutional credits including Lab, PPGLEV, UFRJ and CNPq, and separately identifies the coordination teams.  

I would keep the present three columns and add:

**Coordenação**

containing two small groups:

**Laboratório**
João Moraes
Manuella Carnaval

**PROVALE em Extensão**
Carolina Gomes da Silva
Manuella Carnaval
Juliana Dias

Responsive behavior:

```text
desktop     4 columns
tablet      2 × 2
mobile      1 column
```

No new component library is required.

---

### PROVALE

Replace the placeholder immediately with the supplied paragraph. It is complete enough to function as the project's presentation copy. 

The visual hierarchy should probably be:

```text
PROVALE em Extensão
Projeto de Extensão

[logo, if available]

presentation text

Instagram / social content
```

That keeps the social embed subordinate to the academic description instead of making the section look like a social-media widget.

---

### Docentes

I recommend storing this in data rather than hardcoding João's name into sorting code:

```text
{
  "name": "João Moraes",
  "role": "Docente",
  "badge": "Fundador",
  "priority": 0
}
```

Everyone else has ordinary priority and is sorted with a Portuguese locale-aware collator:

```text
priority
→ then alphabetical pt-BR
```

That produces:

```text
João Moraes — Fundador

Albert Rilliard
Carolina Gomes da Silva
Carolina Serra
Manuella Carnaval
Vitor Caldas
```

using the names supplied in the meeting document. 

The special status is therefore data, not an exception buried in JavaScript.

---

### Parcerias

Add CNPq as one additional record using exactly the existing partner schema and visual treatment. The meeting brief explicitly calls for it. 

No renderer change should be required unless the current layout has a fixed item count—which itself would be worth correcting.

---

# 9. A few additional improvements I would include

These are all small enough to justify doing now because they directly support the redesign rather than expanding scope.

**Unsaved-change indicators.** Each editor tab containing a draft should show something like `● Alterações não salvas`. Switching tabs must not discard drafts.

**Explicit success states.** After an operation, show persistent but unobtrusive confirmation: “Salvo neste computador”, “Projeto remoto atualizado”, “Site publicado”. This is much more useful than transient technical messages.

**Section/navigation validation.** New custom-section slugs must be unique, and navigation labels should update automatically with the section definition.

**Image dimensions and lazy loading.** Where appropriate, static images should have explicit dimensions and `loading="lazy"` to reduce layout shifts and needless loading. The logo, being above the fold, should not be lazy-loaded.

**Keyboard/accessibility behavior for the editor tabs.** The new tabs should use proper tab semantics and keyboard navigation rather than merely styling buttons to look like tabs.

**Active navigation state on the website**, if it is not already present, would be a worthwhile low-cost refinement: as the user scrolls through the single page, the current section can be indicated in the header using `IntersectionObserver`. I would classify this as optional, not a blocker.

---

# 10. What I would deliberately defer

To protect both the budget and the now-working system, I would **not** add any of these in this phase:

```text
drag-and-drop page builder
arbitrary CSS editor
arbitrary HTML/JavaScript sections
autosave to FTP
live collaborative editing
undo history across sessions
new backend
database
plugin architecture
image library manager
automatic Instagram API integration
auto-update system for Electron
```

Some might eventually be useful. None is needed to solve the problems you described.

---

# 11. Recommended implementation order

This matters a lot for regression control and token/credit consumption.

1. **Create one clean post-sanitation checkpoint.** Record current test/build/package status. No more infrastructure audit.

2. **Website content and low-risk visual corrections first:** PROVALE text, CNPq, docentes ordering/founder metadata, four-column footer, stronger logo behavior. These are small, independently testable changes.

3. **Refactor editor navigation into tabs**, but do not change persistence logic. Move the existing controls into the new modules and derive tab availability from existing state. Add Portuguese guidance and demote “Abrir projeto local”.

4. **Implement generic new sections** using one generic renderer and constrained content blocks. Add positioning and persistence.

5. **Add Instagram embedding** as the first use of the new embed block—or as the existing Extensão field if that produces less code. Parse/normalize trusted Instagram embeds; do not introduce arbitrary script storage.

6. **One final integrated acceptance cycle:** retrieve real `/source/` → edit → add custom section → reorder → preview → save → update source → retrieve fresh → build → packaged editor test. Then publish only after preview approval.

This sequencing means a bug in the editor redesign cannot endanger the already-working public page, and each development run has a very clear stopping condition.

---

## Processing-cost strategy

Given your resource constraint, I would use **three agent runs**, not one enormous run and not ten tiny ones.

| Run   | Scope                                                           | Astra reasoning   |
| ----- | --------------------------------------------------------------- | ----------------- |
| **A** | Website content/layout fixes + logo/footer/PROVALE/team/CNPq    | **Low or Medium** |
| **B** | Editor tabs, workflow guidance, local-project demotion          | **Medium**        |
| **C** | Generic sections + Instagram embed + final regression/packaging | **Medium**        |

Only escalate to **High** if a real regression or state/persistence problem appears.

For each run: focused tests while editing, **one full suite at the end**, one production build at the end, and package Electron only when packaged code has materially changed. That avoids the repeated full-test/build/package loops that consumed resources in earlier development.

The most consequential design decision here is the generic-section model. I would settle that architecture before asking the agent to code it. Everything else on your list is comparatively straightforward.

[1]: https://github.com/facebook/meta-embeds-for-wordpress/blob/main/readme.txt?utm_source=chatgpt.com "meta-embeds-for-wordpress/readme.txt at main · facebook/meta-embeds-for-wordpress · GitHub"
