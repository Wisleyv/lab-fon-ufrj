# Lab-FON Editor — Manual C2 Acceptance Report and Usability Findings

## Acceptance Update: f8064e2

The maintainer's subsequent follow-up reports that checkpoint `f8064e2` passed the disposable-project manual checklist. This records user-observed acceptance, not new agent-performed GUI testing.

Confirmed: unified content selection; custom-instance routing and independent content; focused forms and Save/Discard guards; inline preview; local save destination; local/remote gating; generated custom-section width; keypad and top-row zoom; button hierarchy and keyboard focus; narrow-window/200% zoom; and generated-site review.

The local C2/UX correction slice is manually accepted. Compatible packaging and any production rollout remain separate, unperformed gates. The Equipe photo picker added afterward requires its own [manual retest](EQUIPE_PHOTO_PICKER_RETEST.md).

The original report below describes `e2d26ac` and is retained as historical evidence; its unresolved-issue assessment is superseded by this acceptance update.

**Date:** 2026-09-13\
**Checkpoint under test:** `e2d26ac`\
**Branch:** `chore/verified-editor-cleanup-plan-2026-09-11`\
**Test mode:** disposable local project / development editor

## Executive assessment

Manual testing substantially confirms the persistence, composition, build/review, and enable/disable behavior expected from C2. However, C2 should **not yet be declared fully accepted**, because a newly created custom section does not expose an evident/working content-editing path beyond its title and navigation label. The generated review build therefore renders the new section title but no usable section content.

The test also exposed several editor-usability and state-feedback issues that should be resolved before moving on to C3 or Instagram integration.

## Confirmed working behavior

- Existing section editing works as expected.
- Page composition changes can be saved.
- `content/page.json` persistence appears correct:
  - version 2 is present as expected;
  - distinct custom-section IDs are preserved;
  - section ordering/content metadata survive save/reopen;
  - disable/re-enable behavior retains the custom section in storage.
- Adding/removing/reordering sections appears to persist correctly.
- The **Revisar** tab works:
  - the build runs without errors;
  - the generated output reflects the newly created section structurally;
  - built-in content remains functional.
- The persistence/output checks requested under item 7 of the manual checklist appear to behave as expected.
- The **Publicar** workflow reaches the publication path, but its final status handling has a local-project defect described below.

## Acceptance defects / regressions to resolve

### 1. Custom-section content editing is not discoverable or does not work correctly

A new custom section can be created and assigned:

- a title;
- a navigation label;
- placement/visibility metadata.

However, there is no evident working way to edit its actual content. The expected C2 block-editing capability is therefore not usable from the observed UI.

The **Revisar** build confirms the consequence: the section is rendered with its title, but with no meaningful content because the content-editing path is absent, inaccessible, or not correctly connected to the new instance.

This is the principal reason C2 manual acceptance remains incomplete.

### 2. Editor preview/composition panel does not refresh with page composition changes

The editor's preview panel does not update as sections are added to or removed from the page.

This is distinct from the generated **Revisar** build, which does work. The issue appears to concern the in-editor preview/state synchronization.

Expected behavior: after an add/remove/enable/disable/reorder action, the preview/composition representation should reflect the current draft without requiring an unrelated reload or build.

### 3. Publication status hangs in local-project mode

The **Publicar** tab appears to execute, but the interface remains showing:

`Atualizando projeto remoto...`

This is misleading when the active project is the disposable local project rather than a remote source. The operation/state model needs to distinguish local and remote modes and always settle into a correct success/error/idle state.

No real FTP or production publication should be used to diagnose this issue.

## Usability/design findings

### 4. Editing forms are visually cumbersome

The current forms use long vertical layouts with nested frames/fieldsets. The supplied screenshot shows, for example:

- an outer `Apresentação` fieldset;
- a nested `Links` fieldset;
- further nested `Links 1`, `Links 2`, `Links 3`, etc.;
- long scrolling to reach later controls;
- browser-default-looking controls and action buttons.

The resulting hierarchy is difficult to scan and becomes increasingly cumbersome as datasets grow.

### 5. Replace "all items expanded" with item selection + focused form

A more usable model would let the maintainer choose the item to edit from a selector/list, then display one focused form for that item.

Desired behavior:

1. choose an item;
2. edit only that item's form;
3. save or discard its pending changes before moving to another item;
4. return to the selector/list to choose the next item.

The implementation should reuse the existing save/persistence model where possible rather than introducing unnecessary per-item storage transactions. A dirty-state guard should prevent accidental navigation away from unsaved edits.

This pattern should be considered for collection-like editors such as Equipe, Parcerias, Linhas de Pesquisa, and other datasets where the current "everything expanded" layout is unwieldy. Site-level structured content may use the same concept at the logical-block level.

### 6. Buttons need a deliberate editor visual system

Buttons at the bottom of editing forms currently appear as plain browser controls with white/gray backgrounds and little visual hierarchy.

They should adopt a restrained version of the Lab-FON visual language:

- consistent typography;
- primary/secondary/destructive hierarchy;
- spacing and sizing;
- border radius/borders consistent with the site/editor palette;
- hover/focus/disabled states;
- keyboard-visible focus.

Do not import the public-site stylesheet wholesale; reuse or mirror suitable design tokens in the editor stylesheet.

## Missing media-management capabilities

### 7. Parcerias: institution logo

Each partner/institution should have an optional logo field that can be populated through a file-selection/upload control.

The editor should not require maintainers to type a filesystem or asset path manually.

### 8. Equipe: team-member photo

The current photo field exposes a plain text path.

Replace/supplement it with a clear button such as:

`Carregar foto`

The user should be able to select a local image and have the editor copy/manage it inside the project using the existing project asset conventions. Updating/replacing an existing photo should also be supported.

Do not persist an absolute Windows path into content JSON.

### 9. Site images

The Site editor currently exposes image-related values as plain text.

Provide file selection/upload for fields that actually represent image assets.

**Important semantic check:** before changing a field named `imagem alternativa`, inspect the schema and renderer. If this field is actually alternative text (`alt`) for accessibility, it must remain a text field and should instead be relabeled clearly, for example:

`Texto alternativo (acessibilidade)`

Only fields that represent an actual image file should receive an upload/file-picker control.

## Overall acceptance decision

C2 manual acceptance is **partial, not final**.

### Accepted aspects

- persistence;
- stable custom IDs;
- ordering;
- enable/disable retention;
- generated build;
- built-in section integrity;
- local save/reopen behavior.

### Still blocking final C2 acceptance

- custom-section content editing must become evident and functional;
- in-editor preview must synchronize with composition changes;
- final local/remote publication status must not hang or misrepresent the operation.

## Recommended development order

Before C3 or Instagram:

1. reproduce and fix the custom-section content-editing/discoverability defect;
2. fix in-editor preview synchronization;
3. fix local-vs-remote publication status completion;
4. implement the focused item-selector form UX and visual button hierarchy;
5. add safe image selection/copy/update support for Equipe, Parcerias and actual Site image fields;
6. complete the previously deferred Portuguese labels/help pass (B3), now explicitly authorized;
7. repeat manual C2 acceptance;
8. only then proceed to C3.

No production FTP or public-site publication is required for these fixes.
