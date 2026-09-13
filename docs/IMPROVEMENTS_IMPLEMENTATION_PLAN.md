# Improvements Implementation Plan

Status: development checkpoint through C2, September 13, 2026. Implementation status is recorded below; this document does not authorize packaging or production deployment.

Request: [improvements.md](improvements.md). Baseline: September 7 production milestone and September 11 [sanitization report](SANITIZATION_REPORT_2026-09-11.md).

## Current Checkpoint

| Slice | Status | Checkpoint evidence / remaining gate |
| --- | --- | --- |
| A1 | COMPLETE | Supplied PROVALE text and CNPq record, with preservation tests |
| A2 | COMPLETE | Structured footer coordination, credits and copyright binding with tests |
| A3 | COMPLETE | Founder metadata, Docentes ordering and editor round-trip coverage |
| A4 | COMPLETE; manually accepted | Centered expanded identity and compact-on-scroll behavior; earlier handoff pending notes are historical |
| B1 | COMPLETE; manually accepted | Six accessible tabs and advanced local open, with draft-preservation tests |
| B2 | COMPLETE; manually accepted | Readiness guards, revision-bound receipts, compact status and Labfonac identity refinements |
| B3 | DEFERRED | Session-level agent/interface constraint; not a production blocker |
| C1 | COMPLETE | Registered-section insertion and re-enable placement, including stale-target rejection |
| C0 | COMPLETE | Approved [custom-section contract](CUSTOM_SECTION_CONTRACT.md); its original proposal wording is historical |
| C2 | LOCAL C2/UX MANUALLY ACCEPTED | Maintainer accepted the full f8064e2 disposable-project checklist; packaging and production gates remain separate |
| Equipe media | IMPLEMENTED; MANUAL RETEST PENDING | Restricted native photo picker, managed copies, form preview and canonical Save/Discard verified automatically |
| C3 | NOT STARTED | Additional controlled blocks/layouts |
| D | NOT STARTED | Instagram integration |
| Integrated release | NOT STARTED | No compatible custom-schema package or production rollout performed |

**C2 production gate: do not upload projects containing `schemaVersion: 2` / custom sections to production `/source/` until a compatible Editor Labfonac package is ready, maintainers have upgraded, and a pre-feature editable-source backup has been made. Older packaged editors may strip unknown custom data during normalization. Do not publish a checkout build as a substitute.**

C2 verification from the preceding implementation run: 101 focused tests passed; the full suite passed once (278 tests / 26 files); `npm run build` passed for web and editor. Two independent UUID-based custom instances passed shared preview/public rendering and save/read-back/reopen checks. Disabled instances retain their content; unsupported schema/custom data is refused. `content/page.json` remains unchanged and unversioned, with no demonstration custom sections. Version 2 is staged only on explicit custom creation; legacy saves do not automatically upgrade.

The earlier Git-only checkpoint review changed documentation only and reused the preceding verification results. The subsequent acceptance corrections and new verification are recorded below. Browser screenshot verification was unavailable in C2 and is not claimed. Manual-acceptance labels for A4/B1/B2 reflect the maintainer's accepted session state, not a new browser test. Existing checkout/production composition divergence and About/footer coordination discrepancy remain unresolved release inputs, not silently reconciled content.

Git checkpoint scope: improvement source, tests, canonical content changes from A1-A3, generated tracked data, this plan and the C0 contract. Exclude local workspace settings, personal time-report CSV, run prompts, and the older A3/A4 handoff containing machine-specific paths. Ignored credentials, backups, caches, dependencies and build/package artifacts remain excluded. Git-only push uses the existing feature-branch upstream, never `main` (which triggers deployment).

## Assessment

### September 13 Equipe Photo Picker

The maintainer explicitly accepted checkpoint `f8064e2`, including unified selection, focused forms/dirty guards, custom routing/content/preview/layout, local-save feedback, local remote-action gating, keypad/top-row zoom, button/focus behavior, narrow-window/200% zoom and generated review. This user-observed acceptance is recorded in [the manual report](C2-manual-acceptance-report-2026-09-13.md). It is not a new agent GUI claim.

The first media slice is Equipe only. Existing photos live in `public/assets/images/`; the existing `foto` field stores `assets/images/...`, and Vite copies public assets unchanged into `dist/`. Neither the schema nor the public team-card renderer was changed. There was no existing image-import helper; the native `image-assets.cjs` service and focused-field override now provide that reusable boundary without adding dependencies or another asset tree.

- Main remembers the project opened/retrieved by each Electron sender. Only that project's image operations are allowed; renderer requests cannot choose arbitrary source/destination files. Preload exposes select/read-image operations, not filesystem APIs. Existing isolation settings are unchanged.
- The native dialog accepts JPG/JPEG, PNG and WebP; the helper checks extension, regular-file size (maximum 20 MB) and signature. This is bounded type validation, not a complete image decoder or image-processing pipeline.
- Copies use `public/assets/images/image-<uuid>.<ext>` and exclusive creation, retrying collisions without overwriting another asset. Persisted paths use forward slashes and never contain the original absolute filename. Asset-directory links/junctions and preview traversal are refused.
- The selected Equipe form shows the current photo, a read-only relative-path value, and Carregar foto/Alterar foto. Missing/unresolvable photos report a non-destructive unavailable status. Existing references, including valid external URLs, are retained on unrelated edits; native preview reads only the active project's image assets and does not fetch external URLs in main.
- Selection copies the binary immediately but changes only the content draft. Normal Save/read-back persists `foto`; Discard restores the prior reference. Old/shared/unused copies are deliberately retained. Pending selection uses existing global readiness guards, and disposed fields ignore late results.
- Photo removal is deferred: the current renderer's empty-photo fallback points to absent `placeholder-avatar.jpg`. No new removal semantics, asset deletion or public-layout redesign were introduced.

Verification: **141 focused tests passed (7 files); 329 full-suite tests passed once (28 files); web/editor production build passed once.** Fixture coverage includes bridge wiring, active-root confinement, cancellation, signature/size rejection, collisions, legacy/no-photo states, failed saves, discard/reopen, member independence, canonical build-data and real Vite asset copying. Existing full-suite FTP fixtures stayed local and disposable. The existing port-4177 preview serves the current built editor; actual native dialogs/image decoding/visual acceptance remain manual.

Use [EQUIPE_PHOTO_PICKER_RETEST.md](EQUIPE_PHOTO_PICKER_RETEST.md) to update application code in `C:\Temp\labfonac-c2` while preserving content/assets. No real project photos or content were modified by this implementation. Parcerias/Site media, C3, Instagram, packaging, real FTP/source update and publication were not started. B3 remains deferred by the session-level constraint, not a production blocker.

Next exact action: complete this Equipe manual retest. After acceptance and separate authorization, the next media slice is to establish Parcerias' logo-field semantics and apply the same restricted picker; do not silently add fields or roll this into Site/C3 work.

### September 13 Unified Content and Focused Forms

The updated follow-up prompt reports successful manual retesting of `2e0378b`: custom editing, independent instances, automatic draft preview, persistence/reopen, Revisar, and local/remote gating are confirmed. The earlier correction and pending-acceptance descriptions below are historical. Existing C2 ownership, schema and remote safeguards were not reopened.

This follow-up completes the six requested local-editor fixes:

- One Conteudo selector now includes all built-in datasets and each custom instance, using its immutable ID and a numbered title. Disabled custom instances remain editable and identifiable. Only the selected built-in or custom editor is shown. Pagina's Editar conteudo and new-section creation route through this selector.
- Equipe, Parcerias and Linhas de Pesquisa reuse their existing single-record selection. Site and Extensao now use focused logical-group and nested-item selectors through `focused-fields.js`, including nested Links, footer groups and extension projects. Optional objects remain absent/null until edited; canonical schemas and save/read-back services are unchanged.
- Pending edits block item/group navigation until explicit Save/Discard. Creating another custom section also requires resolving pending changes. Nested add/remove/reorder remain explicit draft operations. Selector/reorder rerenders preserve keyboard focus where possible. Custom blocks remain a flat set of block fieldsets within the one selected custom instance; they are not nested dataset frames.
- Custom public/preview sections now use `.container > .content-prose`, matching existing prose sections instead of using the wider outer container alone. Link/CTA text wraps within its available width. No new fixed width or editorial data change was introduced.
- Successful page save identifies the local project path, distinguishes a retrieved project's local working copy, and explicitly reports no FTP transfer. Source update/publication remain separate operations.
- Electron handles Ctrl+NumpadAdd/Subtract using `before-input-event`; default top-row/reset handling is untouched. Consuming the handled event prevents a second menu zoom step. Ordinary keypad typing, AltGr, Meta and composing input are not intercepted. Primary/secondary/destructive button styles reuse editor colors and existing disabled/focus semantics.

Verification: **136 focused tests passed (7 files); 300 full-suite tests passed once (27 files); `npm run build` passed once for both web and editor.** The full suite's FTP/build fixtures are disposable local tests, not production operations. The existing local preview responds on port 4177; no browser screenshot or actual Electron keyboard acceptance was performed by the agent. Follow [the focused-form retest guide](EDITOR_FOCUSED_FORMS_RETEST.md), preserving the existing disposable project's content.

Normal Portuguese labels and outcome/error statuses were implemented. B3 contextual instructional help remains **Deferred -- blocked by session-level agent constraint; not a production blocker.** Media pickers, C3, Instagram, dependency upgrades, packaging, real FTP/source update and production publication were not started.

Next implementation slice, only after this retest is accepted and separately authorized: a narrowly scoped Equipe photo picker using the existing relative-asset and desktop-host boundaries. Parcerias/Site media controls require their own field-semantic review; do not batch them with C3 or Instagram.

### September 13 Manual Acceptance Follow-up

The maintainer's [manual report](C2-manual-acceptance-report-2026-09-13.md) supersedes the earlier unattempted/pending description. Testing in a disposable desktop project confirmed existing content editing, canonical version-2 persistence with distinct IDs, ordering, save/reopen, disable/re-enable retention and successful Revisar output. C2 is partially accepted, not fully accepted: the custom block editor is not evident, the inline preview remains stale, and local-project remote-update feedback can remain in progress. Earlier automated counts remain historical evidence, not proof of these manual scenarios.

Pre-C3 correction sequence:

1. Expose the existing custom block editor for the selected instance and make current selection clear.
2. Refresh the existing inline preview from draft changes, including invalid-draft and async-render handling.
3. Distinguish local from retrieved projects and prevent local-only projects entering remote update/publication; verify deterministic operation completion with mocks.
4. Separate follow-up: focused item/logical-group selection, nested-array presentation, save/discard protection and consistent button hierarchy. Existing collection record selection already guards dirty changes; reuse it.
5. Separate follow-up: native image picker/copy and relative asset paths for Equipe, optional Parcerias logos and actual Site image fields. Accessibility alt text must remain text; verify field semantics before media changes.

This run completes only corrections 1-3 before a checkpoint. B3 contextual help remains deferred under the higher-priority session interface constraint; normal action labels, errors and status outcomes remain permissible. No C3, Instagram, dependency upgrade, packaging or production operation is authorized as a side effect. Repeat desktop acceptance after the corrections; no agent-performed GUI result is claimed.

Correction result: **1-3 IMPLEMENTED; DESKTOP RETEST PENDING.** The custom editor was below the long built-in form, not missing from the schema. Creation now opens Conteudo with the new instance selected and focused; the custom panel precedes the built-in form, identifies the edited title, and Pagina has an explicit Editar conteudo action. Existing whole-page Save/Discard and independent custom block arrays are unchanged. The existing preview renderer now follows draft/model changes with serialized/coalesced refreshes; invalid drafts clear stale output instead of rendering a reduced composition.

The project loader now retains local versus retrieved-FTP origin. Explicitly local projects cannot enter remote-source update or publication, even with a saved ready profile; they can still save/build/review locally. Retrieved projects retain source-update-before-build behavior. Operation results that are missing/malformed become terminal failures instead of throwing while the UI remains busy; success, failure and rejection are covered with mocks. This prevents the reported local action path, but does not claim reproduction of a real server/network hang or cancellation of an unfinished network transfer.

This checkpoint also includes the prior two-line Electron startup correction and its tests: the imported development entry initializes the desktop window, and its URL includes `/labfonac/editor.html`. No dependency changes or packaging were needed.

Verification: **128 focused tests passed (7 files); 289 full-suite tests passed once (27 files); web/editor production build passed once.** Existing full-suite FTP tests used disposable local fixtures only. No manual GUI checks were performed by the agent. Canonical editorial content, production `/source/` and public `/` remain untouched.

Exact retest, using a fresh disposable copy of this correction checkpoint (not the old e2d26ac copy): create two custom sections and confirm automatic Conteudo selection; edit all five block types independently; use Pagina's Editar conteudo action; rename/reorder/disable/re-enable and watch inline preview without clicking Preview; enter invalid text/URL and confirm stale preview is replaced by an error; save/reopen and use Revisar; confirm local remote-action buttons are disabled with a local-project reason. Check keyboard focus, narrow desktop window and 200% zoom. Do not connect to production. After this retest, correction 4 (focused forms and button hierarchy) is the next implementation slice; media support remains correction 5.

The requested direction is appropriate: improve the maintained site and editor without reopening the static-hosting, desktop bridge, or FTP architecture. However, not every proposed change is equally small. Website content, footer binding, insertion placement, and tab navigation can be isolated; repeatable custom sections cross several existing contracts and need a separate design gate.

"Regression-free" is the acceptance objective, not a guarantee based on this inspection. Each slice must preserve existing behavior except its explicitly requested change, pass focused checks, and remain independently reversible. Stop at the agreed slice boundary rather than automatically implementing this entire plan.

This planning run inspected only relevant content, meeting notes, composition/rendering/editor modules, associated tests, and the sanitization handoff. It did not inspect the live site, reconnect FTP, verify Meta's current embed support, run tests/builds, or change application files. The 176-test result is the recorded sanitization baseline, not a new result from this planning run.

## Findings and Reuse Boundaries

The findings below describe the original planning baseline; the checkpoint table above supersedes their implementation-status implications. Original rationale and constraints remain applicable.

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

**Status: COMPLETE.** Existing content/partner schema reused; supplied text and CNPq covered by tests.

Changes: `content/extensao.json`, a new `content/parcerias/cnpq.json`; relevant content/extension/partner tests only if needed. Use the existing editor forms for intended remote editorial changes; do not replace the whole retrieved `content/` tree with checkout data.

- Populate PROVALE `minibio` verbatim, retaining project ID and nesting. Leave unrelated fields untouched.
- Add one CNPq record using `nome/sigla/localizacao/tipo/descricao/url`; leave unsupported optional data empty rather than inventing institutional claims.
- Adjust only PROVALE title/type hierarchy in `extensao.js` if necessary. Keep social content below the presentation. Existing image handling already uses lazy loading.

**Tests/exit:** exact paragraph preserved, one CNPq record, existing partners unchanged, no duplicate IDs, escaping intact, and preview with production-composition fixture. No renderer rewrite for a fifth partner.

### A2. Footer Data Binding (Low-Medium Risk)

**Status: COMPLETE.** Coordination, credits and copyright refinements implemented and tested.

Changes: `site-content.js`, `main.css`, approved values in `content/site.json`; reuse `content-fields.js` controls. Extend `site-content.test.js` and relevant editor-content coverage.

- Render the existing institutional-credit fields and one additional coordination column containing the two existing structured groups.
- Preserve the current three columns, contacts and safe-link/hidden-section filtering. Avoid duplicating coordination into `footer.sections` as a second source of truth.
- Use explicit responsive 4 / 2 / 1 column behavior. Empty optional groups/credits should not create empty headings; older `site.json` must still render.

**Tests/exit:** populated and absent fields; correct names/group headings; legacy footer unchanged when new fields empty; editor save/read-back/preview parity; narrow viewport and 200% zoom without overlap. Do not silently rename the existing person `role`/`institution` fields while adding rendering.

### A3. Founder-First Docentes (Medium Risk)

**Status: COMPLETE.** Existing founder record carries badge/priority; ordering and editor persistence tested.

Changes: `pesquisadores.js`, existing founder record, `content-fields.js`, and team/content tests. Change `equipe-categories.js` only if required for backward-compatible grouping; do not remove legacy categories globally.

- Keep Portuguese keys already in use. Add optional `badge` and numeric `priority` metadata, with explicit defaults for older records; expose them through the editor with validation.
- Founder gets `badge: "Fundador"`, `priority: 0`; ordinary docentes default to a later priority, then use the existing Portuguese locale-aware name comparison. Do not hardcode a person's name in sorting code.
- Support retrieved legacy `categoria: "fundador"` records in the same Docentes presentation without automatically rewriting every old record. Ensure each person renders once and unrelated category sorting remains unchanged.

**Tests/exit:** metadata survives form save; founder first, remaining docentes alphabetical; missing priority compatible; tie ordering deterministic; badge safe; all view modes, accordion counts/keyboard behavior and Egressos preserved. If tests assert the old separate founder group, update only those expectations explicitly superseded by this request.

### A4. Stronger Logo/Header (Medium Visual Risk)

**Status: COMPLETE; manually accepted.** Expanded centered identity and compact scroll state implemented; historical handoff sizing/pending notes do not override this checkpoint.

Changes: `main.css`; `header-scroll.js` only if a measured threshold/layout issue requires it. Tests: `header-scroll.test.js` plus targeted browser checks.

- Start at the restrained end of the proposed 1.35-1.45 range (approximately 81 px versus the current 60 px compact logo), with a smaller mobile bound. Use real logo dimensions and header space rather than a transform that overlaps neighbors.
- Reuse the current state class; preserve aspect ratio, mobile toggle, tablet wrapping and reduced motion. Responsive bounds apply to logo dimensions, not viewport-scaled text.
- Test sticky-header shrink/grow for scroll-position feedback near 24 px. Prefer CSS-only adjustment; introduce hysteresis only if oscillation is reproduced. Check anchor offsets so the resized header does not hide headings.

**Exit:** approved desktop/tablet/mobile top-scroll-return screenshots, keyboard focus, 200% zoom, and no overlap, abrupt displacement or threshold oscillation. Do not redesign the hero or navigation.

## Phase B - Editor Usability Without Persistence Redesign

### B1. Real Tabs and Advanced Local Open (Medium Risk)

**Status: COMPLETE; manually accepted.** Accessible tabs retain control/draft ownership; advanced local open remains available.

Changes: `bootstrap.js`, `state.js` only as needed for selected tab, `editor.css`; existing bootstrap/composition/content UI tests. Extract small view-building helpers only where they prevent duplication; no wholesale bootstrap rewrite.

- Six always-visible tabs: Conectar, Projeto, Conteudo, Pagina, Revisar, Publicar. Use Portuguese accents in actual UI labels.
- Instantiate existing controls once and hide/show panels instead of destroying forms and rebuilding drafts. Preserve stable control IDs and handler ownership.
- Tabs are selectable to inspect status even before prerequisites are met; disable unsafe operation controls, not access to the whole workflow map. Use tablist/tab/tabpanel semantics, selected state, roving focus, arrows, Home/End, and predictable focus restoration.
- Move the local directory picker into an accessible advanced disclosure in Projeto; keep it usable without FTP for recovery/offline work. Never make server connection depend on a valid local project.

**Exit:** cross-tab navigation preserves content/composition drafts and in-flight operations; hidden panels are not focusable; no duplicate handlers/IPC calls; clean/no-project/offline states usable. Existing save/retrieval/publish guard behavior remains intact.

### B2. Operation Availability and Status (Medium Risk)

**Status: COMPLETE; manually accepted.** Shared readiness, revision-bound receipts and compact status presentation implemented and tested.

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

**Status:** Deferred -- blocked by session-level agent constraint; not a production blocker.

Use concise action labels, field-level validation, disabled-action reasons, persistent outcome messages, and an accessible contextual help control. Put longer "what happens next" explanations in help, not repeated instructional banners or a new onboarding system. Essential errors must not exist only in tooltips. Preserve machine-readable diagnostic codes while translating user-facing messages; do not translate server error details destructively.

**Exit:** keyboard/touch help access, Escape/close and focus return, meaningful status announcements without repeated screen-reader chatter. Save, source update and publish remain unambiguous.

## Phase C - Constrained New Sections (Highest Risk; Design Gate First)

### C0. Approve the Data and Compatibility Contract

**Status: COMPLETE.** `docs/CUSTOM_SECTION_CONTRACT.md` was approved by the C2 implementation prompt; preserve its schema, ownership and rollout decisions.

Recommended smallest model: a repeatable `custom` section in existing `content/page.json`, with stable instance `id`, `title`, current navigation/enabled/order fields, `presentation.variant`, and a validated `content.blocks` array. Keep initial custom content in that single canonical file to reuse composition Save/read-back and avoid introducing cross-file transactions/deletion ledgers. Public rendering receives this content through the existing consolidated page data/adapter, never direct filesystem access.

Initial palette: heading, plain text, list and safe link/button; initial layout: text. Add image, embed and the requested wide/cards layouts in subsequent slices, not in the initial persistence change. Use immutable IDs after creation in the first version; title and navigation label may change without breaking anchors. Default navigation label from title until deliberately overridden.

Important compatibility gate: current normalizers discard unknown fields/types. Teach validation/normalization/comparison to preserve supported custom data and reject unsupported content without silently saving a reduced document. Define a supported schema/version marker and bounds for IDs, blocks, text and URLs. New readers must fail safely on unsupported future schemas.

Older installed editors cannot be made safe retroactively by adding a version marker they ignore. Before introducing custom content into real `/source/`, upgrade all maintainers to a compatible editor, keep a pre-feature editable-source backup, and document that older binaries must not edit that project. If this cannot be ensured, stop before remote rollout of custom sections.

**Exit:** approved schema/example, compatibility policy, limits and unsupported-content behavior. No real custom content persisted yet.

### C1. Insertion Placement for Registered Sections (Low-Medium Risk, Can Precede C0)

**Status: COMPLETE.** Optional active-instance insertion targets preserve omitted-target behavior, with command/UI/persistence coverage.

Changes: `composition-commands.js`, the existing composition controls in `bootstrap.js`, command/UI tests.

Add an optional insertion target to existing add/enable behavior, including a beginning position; preserve old append/re-enable behavior when omitted. Keep up/down controls. Disabled entries must not make visible placement misleading; validate stale/missing targets and prevent duplicates.

**Exit:** insertion before first/after last/middle, re-enable, save/read-back, and order after retrieval preserve the intended active sequence. No custom schema required for this slice.

### C2. One Custom Text Section End to End, Then Multiple Instances

**Status: LOCAL C2/UX MANUALLY ACCEPTED at f8064e2.** Version-2 validation, immutable UUID identities, Page creation/metadata/placement, Content block editing and shared whole-page save/discard are implemented. Heading, paragraph, list, safe link and CTA blocks use controlled DOM rendering. Two-instance, compatibility, URL, disabled-content and read-back failure tests passed; see checkpoint verification above. The maintainer accepted the subsequent focused-form correction checklist. Compatible packaging and production rollout remain unperformed gates.

Likely files: `page/composition.js`, `page/section-registry.js`, `page/navigation.js`, `main.js`, `editor/composition-commands.js`, `editor/composition-preview.js`, `editor/composition-service.js`, composition UI, plus one renderer extending `SectionRenderer`. Touch `project-loader.js`/`scripts/build-data.js` only if actual page-data preservation requires it; no parallel data loader.

- First extend strict normalization, equality and single-file save/read-back with fixture-only coverage. Verify differing custom text is not normalized away and therefore detected as dirty/verification mismatch.
- Then add instance-specific section/container IDs and shared rendering in preview/public page. Retain fixed IDs for built-in sections.
- Add creation/editing/disable/re-enable/placement controls bound to the same composition draft. Disabling retains content for restoration; permanent deletion is deferred.
- Prove two same-type custom sections work before accepting the feature. Reserve built-in DOM IDs, nested IDs and contact/footer anchors, not just existing page section IDs. Clean up removed custom DOM/listeners on preview rerender.

**Tests/exit:** existing pages unchanged, multiple-instance IDs/navigation correct, malicious text safe, missing fields rejected, save/read-back failure preserves draft, content survives reload/remote-source round trip and build, and built-in sections remain unique. Pure fixture tests precede real remote acceptance.

### C3. Remaining Constrained Blocks and Layouts

**Status: NOT STARTED.** Requires a separate authorized slice after C2 acceptance.

Add one block/layout at a time after C2 passes. Images accept existing approved asset paths or validated URLs with required alternative text and bounded dimensions; no file manager or new upload system. Check `/labfonac/` and packaged-preview bases. Eager-load the header logo; lazy-load appropriate below-fold images.

Specify the minimal grouping semantics for the requested cards layout before implementing it; do not improvise nested arbitrary layout containers. Text and wide layouts remain predefined CSS choices. Test long content, disabled blocks, responsive rendering and complete save/read-back preservation for each increment.

The embed block should reuse Phase D's restricted Instagram representation. Do not open it to arbitrary providers or clipboard HTML. Optional active website navigation can be a separate IntersectionObserver slice later, with existing menu/scroll behavior preserved; it is not a release gate.

## Phase D - Instagram, Independent of Custom Sections

**Status: NOT STARTED.** Provider/input verification and implementation remain future work.

May run after A/B and before C if PROVALE social integration is the higher priority. Existing Extensao fields are the smaller extension point.

Changes: extension form fields and `extensao.js`, a narrowly scoped normalizer/loader only if needed, extension/content tests. Verify current official provider requirements at implementation time, including which URL forms are actually supported. Do not promise an automatically updating profile feed when only individual post embeds are verified.

- Accept an approved Instagram URL or official pasted snippet as input, but persist only normalized provider information and canonical URL. Preserve compatibility with `enabled/source/provider` rather than introducing a duplicate field set.
- Parse snippets inertly, without inserting clipboard HTML into a live DOM. Extract a single approved URL; reject malformed/multiple/conflicting destinations, deceptive hosts, unsafe protocols, credentials, scripts and unsupported forms. Use URL parsing and exact host/path allowlists, not substring matching.
- Generate only controlled markup. Load a fixed official script once per document when needed, with bounded failure handling; avoid duplicate processing/listeners on repeated previews. Give each project/section a unique Instagram region ID; the current fixed `extension-instagram-title` is unsuitable for multiple embeds.
- Keep a normal accessible external link if blocked, offline, private, unsupported, removed or timed out. The site's loader must not wait indefinitely for Instagram. Explain the third-party network/privacy consequence in contextual help; do not invent a backend/API integration.
- Check public-browser and Electron preview behavior separately. Third-party scripts must not receive access to privileged editor bridge functions; if current preview context cannot safely isolate provider code, use inert/link preview in the editor and the isolated generated-site preview for full embeds.

**Exit:** normalizer rejection matrix, script deduplication, unique IDs, offline/timeouts, external-link fallback, preserved project content, and browser/packaged preview acceptance. Unit tests mock the provider; one real public example validates actual support before rollout. Reuse in custom embed blocks only afterward.

## Integrated Acceptance and Release Gate

**Status: NOT STARTED for the custom-section schema.** C2 manual desktop acceptance, compatible-package validation, maintainer upgrades and pre-feature backup precede any production `/source/` update or publication. Existing older releases are not C2-compatible verification evidence.

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

Next exact action: **manual Equipe photo-picker retest in the existing disposable project**, using [EQUIPE_PHOTO_PICKER_RETEST.md](EQUIPE_PHOTO_PICKER_RETEST.md). The `f8064e2` focused-form checklist is already accepted. Only after the new retest, propose separately authorized Parcerias logo-field/picker work. Do not start additional consumers, C3, B3, Instagram, packaging or production FTP automatically.
