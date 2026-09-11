# Improvements Implementation Plan

Status: proposal only; no implementation or deployment authorized by this document.

Request: [improvements.md](improvements.md). Baseline: September 7 production milestone and September 11 [sanitization report](SANITIZATION_REPORT_2026-09-11.md).

## Assessment

The requested direction is appropriate: improve the maintained site and editor without reopening the static-hosting, desktop bridge, or FTP architecture. However, not every proposed change is equally small. Website content, footer binding, insertion placement, and tab navigation can be isolated; repeatable custom sections cross several existing contracts and need a separate design gate.

"Regression-free" is the acceptance objective, not a guarantee based on this inspection. Each slice must preserve existing behavior except its explicitly requested change, pass focused checks, and remain independently reversible. Stop at the agreed slice boundary rather than automatically implementing this entire plan.

This planning run inspected only relevant content, meeting notes, composition/rendering/editor modules, associated tests, and the sanitization handoff. It did not inspect the live site, reconnect FTP, verify Meta's current embed support, run tests/builds, or change application files. The 176-test result is the recorded sanitization baseline, not a new result from this planning run.

## Findings and Reuse Boundaries

| Area | Current evidence | Reuse / consequence |
| --- | --- | --- |
| PROVALE | `content/extensao.json` has empty `minibio`; the complete supplied paragraph is in `docs/update_site_labfon.md`, immediately below the PROVALE heading | Use the existing `minibio` field and `ExtensaoSection`; preserve the paragraph verbatim |
| Footer | `content/site.json` and `content-fields.js` already contain `institutionalCredits` and `coordination.lab/extensionProject`; `applyFooterContent` currently renders only `sections` and `bottomText` | Extend existing binding, not a second footer schema or hardcoded names in HTML |
| Team | `PesquisadoresSection` groups by `categoria` and already sorts names with `pt-BR`; the checkout's `joao-antonio-de-moraes.json` is already `docentes`, named `Joao Antonio de Moraes` | Identify the existing record, do not create a duplicate. Extend metadata without renaming existing `nome`, `categoria`, `foto`, or `lattes` fields |
| Partners | Four current records use the existing Portuguese-key schema; `ParceriasSection` iterates the collection | Add CNPq through that schema; do not create a special partner renderer |
| Header | `initHeaderScroll` uses a passive listener and requestAnimationFrame with a 24 px threshold; CSS applies 1.12/1.0 transforms | Reuse `.is-scrolled`, cleanup and reduced-motion handling; no second scroll listener |
| Editor navigation | Six navigation buttons in `bootstrap.js` only change active styling and scroll to sections | Introduce real tab panels while retaining the existing control instances, event handlers and draft state |
| Draft/persistence | `createContentEditor`, `CONTENT_DATASETS`, composition commands/service, `DesktopHostBridge`, and native content store already own their respective saves | Do not merge save paths or make tab navigation persist anything |
| Workflow | Existing store has `remote`, `openedProject`, `build`, `publish`, plus content/composition dirty flags; controller readiness functions enforce operations | Derive availability from these states. There is no reliable numeric change count or durable proof of remote synchronization in these fields |
| New sections | Registry definitions have fixed DOM/container IDs and unique built-in types; `addSection` re-enables a type; normalization reconstructs known fields | A new renderer alone is insufficient: arbitrary custom content would currently be discarded by normalization, and multiple instances would collide |
| Navigation/preview | `navigation.js`, `main.js` and `composition-preview.js` resolve through registry definitions | Custom instances must receive distinct anchors, data, renderer containers and lifecycle handling in both preview and production |
| Instagram | Extension schema already has `instagram.enabled/source/provider`; renderer displays placeholders, not an embed | Implement independently in Extensao first; generic sections need not be a prerequisite |

## Non-Negotiable Constraints

- Static site; no backend, database, new CMS, workflow engine, arbitrary HTML/CSS/JS, or new dependency unless an actual blocker requires approval.
- Local Save, remote-source update, build/preview, and publication remain explicit, separate operations. No remote writes on tab switch or autosave.
- Preserve dirty worktree changes and the ignored sanitization archive. Do not use old archived assets as current inputs without review.
- Preserve production Publicacoes disabled, Extensao enabled, Egressos present, and PROVALE nested under Extensao with no separate top-level navigation item.
- The checkout and `current-content-preservation.test.js` still encode the earlier Publicacoes-enabled/Extensao-disabled state. Do not overwrite remote content from this checkout or weaken those assertions to make unrelated tests pass. Test the production composition with a separate fixture until an explicit canonical-baseline reconciliation is approved.
- Remote `/source/` and publication `/` retain their existing roles. The external verified release remains the recovery artifact. This plan does not authorize a GitHub push; `main` currently triggers deployment.
- Preserve failed-save draft/baseline semantics. Composition read-back failure means the disk may already have changed: report failure, retain the draft, and reconcile before retrying; do not promise rollback the current service does not provide.
- Tabs must remain keyboard accessible and drafts must survive navigation. Never infer a successful save, synchronization, review, or publication merely from a highlighted tab.

## Phase 0 - Confirm the Implementation Baseline

**Small slice:** record the chosen starting files and Git diff without cleaning up again. Reuse the sanitization evidence when unchanged; rerun baseline checks only if relevant code has changed. No infrastructure or live-site audit at this stage.

Before release work, distinguish source-code updates from editorial updates to a retrieved workspace. Decide explicitly whether to reconcile checkout composition and preservation tests with the production state. Until then, keep both test cases and do not publish a checkout build.

Resolve only the inputs needed for the next slice:

- PROVALE copy is available in `update_site_labfon.md`; copy exactly, including punctuation. No wording approval is needed merely because the text was absent from `improvements.md` itself.
- Use the requested footer names: Laboratorio: Joao Moraes and Manuella Carnaval; PROVALE: Carolina Gomes da Silva, Manuella Carnaval and Juliana Dias, with Portuguese accents preserved from the supplied text. Existing About text describes different coordination; flag that discrepancy rather than silently rewriting About.
- Confirm the desired founder display name before changing the existing full name. Badge/order can be implemented independently of renaming.
- Confirm CNPq's approved display name, URL and any optional description before adding the record. No logo is required by the current partner schema. Locate an approved PROVALE logo only if that optional asset is to be included; do not invent one.
- Before Instagram implementation, obtain representative public URL/embed input and verify current official provider documentation. Do not assume the linked WordPress plugin proves that every profile/post/reel embeds without credentials in this static site.

**Exit:** a recorded local baseline and inputs for the chosen slice. Missing optional media or Instagram input must not block unrelated footer/tab work. No commit or remote action is implicit.

## Phase A - Website Improvements in Independent Slices

### A1. Supplied PROVALE Text and CNPq Record (Low Risk)

Changes: `content/extensao.json`, a new `content/parcerias/cnpq.json`; relevant content/extension/partner tests only if needed. Use the existing editor forms for intended remote editorial changes; do not replace the whole retrieved `content/` tree with checkout data.

- Populate PROVALE `minibio` verbatim, retaining project ID and nesting. Leave unrelated fields untouched.
- Add one CNPq record using `nome/sigla/localizacao/tipo/descricao/url`; leave unsupported optional data empty rather than inventing institutional claims.
- Adjust only PROVALE title/type hierarchy in `extensao.js` if necessary. Keep social content below the presentation. Existing image handling already uses lazy loading.

**Tests/exit:** exact paragraph preserved, one CNPq record, existing partners unchanged, no duplicate IDs, escaping intact, and preview with production-composition fixture. No renderer rewrite for a fifth partner.

### A2. Footer Data Binding (Low-Medium Risk)

Changes: `site-content.js`, `main.css`, approved values in `content/site.json`; reuse `content-fields.js` controls. Extend `site-content.test.js` and relevant editor-content coverage.

- Render the existing institutional-credit fields and one additional coordination column containing the two existing structured groups.
- Preserve the current three columns, contacts and safe-link/hidden-section filtering. Avoid duplicating coordination into `footer.sections` as a second source of truth.
- Use explicit responsive 4 / 2 / 1 column behavior. Empty optional groups/credits should not create empty headings; older `site.json` must still render.

**Tests/exit:** populated and absent fields; correct names/group headings; legacy footer unchanged when new fields empty; editor save/read-back/preview parity; narrow viewport and 200% zoom without overlap. Do not silently rename the existing person `role`/`institution` fields while adding rendering.

### A3. Founder-First Docentes (Medium Risk)

Changes: `pesquisadores.js`, existing founder record, `content-fields.js`, and team/content tests. Change `equipe-categories.js` only if required for backward-compatible grouping; do not remove legacy categories globally.

- Keep Portuguese keys already in use. Add optional `badge` and numeric `priority` metadata, with explicit defaults for older records; expose them through the editor with validation.
- Founder gets `badge: "Fundador"`, `priority: 0`; ordinary docentes default to a later priority, then use the existing Portuguese locale-aware name comparison. Do not hardcode a person's name in sorting code.
- Support retrieved legacy `categoria: "fundador"` records in the same Docentes presentation without automatically rewriting every old record. Ensure each person renders once and unrelated category sorting remains unchanged.

**Tests/exit:** metadata survives form save; founder first, remaining docentes alphabetical; missing priority compatible; tie ordering deterministic; badge safe; all view modes, accordion counts/keyboard behavior and Egressos preserved. If tests assert the old separate founder group, update only those expectations explicitly superseded by this request.

### A4. Stronger Logo/Header (Medium Visual Risk)

Changes: `main.css`; `header-scroll.js` only if a measured threshold/layout issue requires it. Tests: `header-scroll.test.js` plus targeted browser checks.

- Start at the restrained end of the proposed 1.35-1.45 range (approximately 81 px versus the current 60 px compact logo), with a smaller mobile bound. Use real logo dimensions and header space rather than a transform that overlaps neighbors.
- Reuse the current state class; preserve aspect ratio, mobile toggle, tablet wrapping and reduced motion. Responsive bounds apply to logo dimensions, not viewport-scaled text.
- Test sticky-header shrink/grow for scroll-position feedback near 24 px. Prefer CSS-only adjustment; introduce hysteresis only if oscillation is reproduced. Check anchor offsets so the resized header does not hide headings.

**Exit:** approved desktop/tablet/mobile top-scroll-return screenshots, keyboard focus, 200% zoom, and no overlap, abrupt displacement or threshold oscillation. Do not redesign the hero or navigation.

## Phase B - Editor Usability Without Persistence Redesign

### B1. Real Tabs and Advanced Local Open (Medium Risk)

Changes: `bootstrap.js`, `state.js` only as needed for selected tab, `editor.css`; existing bootstrap/composition/content UI tests. Extract small view-building helpers only where they prevent duplication; no wholesale bootstrap rewrite.

- Six always-visible tabs: Conectar, Projeto, Conteudo, Pagina, Revisar, Publicar. Use Portuguese accents in actual UI labels.
- Instantiate existing controls once and hide/show panels instead of destroying forms and rebuilding drafts. Preserve stable control IDs and handler ownership.
- Tabs are selectable to inspect status even before prerequisites are met; disable unsafe operation controls, not access to the whole workflow map. Use tablist/tab/tabpanel semantics, selected state, roving focus, arrows, Home/End, and predictable focus restoration.
- Move the local directory picker into an accessible advanced disclosure in Projeto; keep it usable without FTP for recovery/offline work. Never make server connection depend on a valid local project.

**Exit:** cross-tab navigation preserves content/composition drafts and in-flight operations; hidden panels are not focusable; no duplicate handlers/IPC calls; clean/no-project/offline states usable. Existing save/retrieval/publish guard behavior remains intact.

### B2. Operation Availability and Status (Medium Risk)

Reuse `getBuildReadiness`, publication readiness, remote state, and existing controllers. Keep operation preconditions out of a parallel workflow engine.

| Tab | Operation rule |
| --- | --- |
| Conectar | Connection test and profile configuration available before project retrieval |
| Projeto | Retrieve with a valid connection/profile and existing unsaved-change protection; advanced local open does not require FTP |
| Conteudo / Pagina | Mutation requires a valid opened project; draft edits remain local and reversible |
| Revisar | Build requires valid saved content/composition; existing build controller remains authoritative |
| Publicar | Source update requires saved content and a valid destination, NOT prior build/review; site publication separately requires current successful build and review |

**Resolve the proposed deadlock:** do not disable the entire Publicar panel until review. Updating `/source/` must remain possible before fresh retrieval/build, preserving the established maintainer sequence.

- Display dirty state as yes/no initially; the proposed "2 changes" count is not derivable from current booleans. Do not add edit-history bookkeeping just for a number.
- Show persistent Portuguese operation outcomes and distinguish local save, source update, and publication. Connection/profile configuration is not proof of a currently live connection; report unverified/disconnected states honestly.
- If a synchronization/review indicator needs new metadata, use minimal in-memory operation receipts tied to project, destination and saved/build revision. Invalidate on edits, project/profile changes, new builds and fresh retrieval as appropriate. Do not label an unknown remote revision "up to date" after restart.
- Review approval must refer to the exact successful build; a later edit/build invalidates it. Preserve the existing publication regression test ensuring readiness is checked before entering the publishing busy state.

**Exit:** table-driven unavailable/busy/success/failure transitions; no false success, stale review or unsafe double action; source-update-before-review works; reconnect and retry preserve drafts. No changes to FTP implementation or credentials.

### B3. Portuguese Labels and Accessible Help (Low Risk)

Use concise action labels, field-level validation, disabled-action reasons, persistent outcome messages, and an accessible contextual help control. Put longer "what happens next" explanations in help, not repeated instructional banners or a new onboarding system. Essential errors must not exist only in tooltips. Preserve machine-readable diagnostic codes while translating user-facing messages; do not translate server error details destructively.

**Exit:** keyboard/touch help access, Escape/close and focus return, meaningful status announcements without repeated screen-reader chatter. Save, source update and publish remain unambiguous.

## Phase C - Constrained New Sections (Highest Risk; Design Gate First)

### C0. Approve the Data and Compatibility Contract

Recommended smallest model: a repeatable `custom` section in existing `content/page.json`, with stable instance `id`, `title`, current navigation/enabled/order fields, `presentation.variant`, and a validated `content.blocks` array. Keep initial custom content in that single canonical file to reuse composition Save/read-back and avoid introducing cross-file transactions/deletion ledgers. Public rendering receives this content through the existing consolidated page data/adapter, never direct filesystem access.

Initial palette: heading, plain text, list and safe link/button; initial layout: text. Add image, embed and the requested wide/cards layouts in subsequent slices, not in the initial persistence change. Use immutable IDs after creation in the first version; title and navigation label may change without breaking anchors. Default navigation label from title until deliberately overridden.

Important compatibility gate: current normalizers discard unknown fields/types. Teach validation/normalization/comparison to preserve supported custom data and reject unsupported content without silently saving a reduced document. Define a supported schema/version marker and bounds for IDs, blocks, text and URLs. New readers must fail safely on unsupported future schemas.

Older installed editors cannot be made safe retroactively by adding a version marker they ignore. Before introducing custom content into real `/source/`, upgrade all maintainers to a compatible editor, keep a pre-feature editable-source backup, and document that older binaries must not edit that project. If this cannot be ensured, stop before remote rollout of custom sections.

**Exit:** approved schema/example, compatibility policy, limits and unsupported-content behavior. No real custom content persisted yet.

### C1. Insertion Placement for Registered Sections (Low-Medium Risk, Can Precede C0)

Changes: `composition-commands.js`, the existing composition controls in `bootstrap.js`, command/UI tests.

Add an optional insertion target to existing add/enable behavior, including a beginning position; preserve old append/re-enable behavior when omitted. Keep up/down controls. Disabled entries must not make visible placement misleading; validate stale/missing targets and prevent duplicates.

**Exit:** insertion before first/after last/middle, re-enable, save/read-back, and order after retrieval preserve the intended active sequence. No custom schema required for this slice.

### C2. One Custom Text Section End to End, Then Multiple Instances

Likely files: `page/composition.js`, `page/section-registry.js`, `page/navigation.js`, `main.js`, `editor/composition-commands.js`, `editor/composition-preview.js`, `editor/composition-service.js`, composition UI, plus one renderer extending `SectionRenderer`. Touch `project-loader.js`/`scripts/build-data.js` only if actual page-data preservation requires it; no parallel data loader.

- First extend strict normalization, equality and single-file save/read-back with fixture-only coverage. Verify differing custom text is not normalized away and therefore detected as dirty/verification mismatch.
- Then add instance-specific section/container IDs and shared rendering in preview/public page. Retain fixed IDs for built-in sections.
- Add creation/editing/disable/re-enable/placement controls bound to the same composition draft. Disabling retains content for restoration; permanent deletion is deferred.
- Prove two same-type custom sections work before accepting the feature. Reserve built-in DOM IDs, nested IDs and contact/footer anchors, not just existing page section IDs. Clean up removed custom DOM/listeners on preview rerender.

**Tests/exit:** existing pages unchanged, multiple-instance IDs/navigation correct, malicious text safe, missing fields rejected, save/read-back failure preserves draft, content survives reload/remote-source round trip and build, and built-in sections remain unique. Pure fixture tests precede real remote acceptance.

### C3. Remaining Constrained Blocks and Layouts

Add one block/layout at a time after C2 passes. Images accept existing approved asset paths or validated URLs with required alternative text and bounded dimensions; no file manager or new upload system. Check `/labfonac/` and packaged-preview bases. Eager-load the header logo; lazy-load appropriate below-fold images.

Specify the minimal grouping semantics for the requested cards layout before implementing it; do not improvise nested arbitrary layout containers. Text and wide layouts remain predefined CSS choices. Test long content, disabled blocks, responsive rendering and complete save/read-back preservation for each increment.

The embed block should reuse Phase D's restricted Instagram representation. Do not open it to arbitrary providers or clipboard HTML. Optional active website navigation can be a separate IntersectionObserver slice later, with existing menu/scroll behavior preserved; it is not a release gate.

## Phase D - Instagram, Independent of Custom Sections

May run after A/B and before C if PROVALE social integration is the higher priority. Existing Extensao fields are the smaller extension point.

Changes: extension form fields and `extensao.js`, a narrowly scoped normalizer/loader only if needed, extension/content tests. Verify current official provider requirements at implementation time, including which URL forms are actually supported. Do not promise an automatically updating profile feed when only individual post embeds are verified.

- Accept an approved Instagram URL or official pasted snippet as input, but persist only normalized provider information and canonical URL. Preserve compatibility with `enabled/source/provider` rather than introducing a duplicate field set.
- Parse snippets inertly, without inserting clipboard HTML into a live DOM. Extract a single approved URL; reject malformed/multiple/conflicting destinations, deceptive hosts, unsafe protocols, credentials, scripts and unsupported forms. Use URL parsing and exact host/path allowlists, not substring matching.
- Generate only controlled markup. Load a fixed official script once per document when needed, with bounded failure handling; avoid duplicate processing/listeners on repeated previews. Give each project/section a unique Instagram region ID; the current fixed `extension-instagram-title` is unsuitable for multiple embeds.
- Keep a normal accessible external link if blocked, offline, private, unsupported, removed or timed out. The site's loader must not wait indefinitely for Instagram. Explain the third-party network/privacy consequence in contextual help; do not invent a backend/API integration.
- Check public-browser and Electron preview behavior separately. Third-party scripts must not receive access to privileged editor bridge functions; if current preview context cannot safely isolate provider code, use inert/link preview in the editor and the isolated generated-site preview for full embeds.

**Exit:** normalizer rejection matrix, script deduplication, unique IDs, offline/timeouts, external-link fallback, preserved project content, and browser/packaged preview acceptance. Unit tests mock the provider; one real public example validates actual support before rollout. Reuse in custom embed blocks only afterward.

## Integrated Acceptance and Release Gate

After each chosen run, use focused tests while editing, then one full `npx vitest run` and one production build. Repackage once when code shipped in the editor changes; content-only edits do not justify repackaging. Run narrower checks between slices, not the entire release workflow repeatedly.

Existing regression families to extend rather than replace: `site-content`, `header-scroll`, `pesquisadores`, `extensao`, `editor-content`, `editor-bootstrap`, `editor-composition-commands`, `editor-composition-ui`, `editor-composition-persistence`, `page-composition`, `build-data`, `editor-build`, `editor-publish`, `editor-publication`, and `editor-remote-retrieval`. Add focused new custom/Instagram tests within the existing test setup. Do not weaken assertions unrelated to intended behavior changes.

Before any remote write, obtain authorization for that implementation run and preserve an editable-source backup. Confirm compatible maintainer package rollout if custom content is involved. Then use the packaged UI:

1. Connect with saved profile and retrieve real `/source/` into the app-managed workspace.
2. Make the approved content edit; exercise relevant tabs, drafts, placement/custom content and Instagram without losing unsaved work.
3. Save locally; update remote source explicitly; retrieve fresh and verify persistence.
4. Build and review `/labfonac/` with production composition, desktop/tablet/mobile, keyboard navigation, assets, loader and console checks. Review long labels, near-threshold scrolling and third-party failure behavior.
5. Publish generated output to `/` only after explicit preview approval, current-build checks and deployment authorization. Do not publish the development checkout as a substitute.
6. Verify the live result and preserved `/source/` and hosting metadata; fresh retrieval must still validate. Restore any temporary test content before publication.

If a gate fails, stop before publication. Revert only the current slice in a controlled working copy or restore its reviewed content snapshot; never reset the dirty repository or overwrite newer remote edits. An older binary is not a valid rollback for a newer custom-section schema unless source content is also restored compatibly.

## Recommended Run Boundaries

- **Run A:** choose A1, then A2; continue to A3/A4 only if approved scope and input readiness permit. Each remains separately testable.
- **Run B:** B1, then B2/B3, optionally the independent C1 placement control. No custom schema or FTP redesign in the tabs run.
- **Run C:** approve C0 and implement C2 only. Add C3 and/or D in subsequent bounded runs; do not force security-sensitive embeds and custom persistence into one budget merely to fit the source document's suggested three runs.
- **Release run:** integrated acceptance and authorized publication after chosen slices are green. Optional active-navigation refinement and unrelated dependency/documentation cleanup remain deferred.

Next exact action: approve the first implementation slice, recommended **A1 (supplied PROVALE text and CNPq through the existing schema)**, resolve its CNPq input, and establish the local baseline. Until then, this file is the only deliverable; no code, content, package, GitHub or FTP operation is requested.
