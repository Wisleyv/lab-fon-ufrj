# Custom Section Contract (C0)

Status: proposal awaiting maintainer approval. No C2 implementation is authorized by this document alone.

Scope: repeatable, controlled text sections in the static Labfonac site and its existing desktop editor. Evidence is current source inspection, not an audit of historical executable packages. C1 remains accepted; B3 remains deferred.

## 1. Current Assumptions That Block Repeatable Sections

| Existing boundary | Observed assumption / required C2 adjustment |
| --- | --- |
| `src/js/page/composition.js` | Unsupported types are diagnosed then filtered out. The normalizer returns the reduced composition without diagnostics. A fixed projection drops new fields such as `schemaVersion`, `title` and `content`. Validate raw input before normalization and preserve the entire supported custom schema. |
| `src/js/page/section-registry.js` | Built-ins are unique by type; renderer creation requires fixed section/container IDs. Register `custom` as repeatable, with instance-derived IDs and a renderer receiving instance content. Keep built-in uniqueness and fixed anchors. |
| `src/js/editor/composition-commands.js` | Add/re-enable and availability use type identity. Draft cloning/equality normalize first. Retain C1's built-in API; custom create/re-enable must identify an instance, preserve blocks, and reuse placement validation/reindexing. |
| `src/js/editor/project-loader.js` | Required JSON is parsed, but the page is normalized without propagating page validation errors. Reject unsupported pages before making an editable model. |
| `src/js/editor/composition-service.js` | Load and read-back normalize; equality can ignore fields removed by normalization. Compare validated complete data, including version, title, blocks and order. Diagnostic summaries keyed by type must become instance-aware. |
| `src/js/editor/composition-preview.js` | Preview construction maps entries to definitions, losing instance identity; data lookup and renderer creation are type-based. Preserve entries through section creation/rendering. |
| `src/js/page/navigation.js` | Registry section ID takes precedence; child references can resolve by type. Custom anchors must use instance ID. Do not add ambiguous `type: custom` child references. |
| `src/js/main.js` | Renderer map already uses entry IDs, but renderer factory, data lookup and visible-anchor derivation use definitions. Extend these existing boundaries rather than adding another renderer pipeline. |
| `scripts/build-data.js` | Valid page JSON is copied intact, but missing/malformed input falls back to defaults. Validate an existing page before consolidation; malformed/unsupported pages must fail, not produce a reduced/default site. Preserve the separately tested missing-page legacy fallback only for unversioned static inputs. |
| `src/js/adapters/JSONAdapter.js` | Currently preserves `page` through its top-level data spread. Keep DataAdapter as the public data boundary; no renderer filesystem access. |
| `src/js/editor/content-editor.js` | Built-in content has its own record saves and dirty state. Custom blocks must use the composition draft/save owner, not `saveContentRecord` or a second page writer. |

Current `content/page.json` is unversioned and contains built-ins only. Its older local editorial baseline is not reconciled with production in C0 or C2.

## 2. Recommended Canonical Data Model

Use `content/page.json` exclusively for custom entries and their blocks. Introduce page-level integer `schemaVersion: 2` when the first custom instance is explicitly saved. Missing version means legacy version 1; explicit version 1 is also supported.

Keep `kind: single-page`, `sections`, `id`, `type`, `enabled`, `order`, `navigation` and `presentation` as the existing structural vocabulary. Do not add parallel `navLabel` or string-valued `presentation` fields.

- Built-ins retain their registered `type` and remain unique by type.
- Custom instances use `type: custom`, unique stable `id`, required `title`, `presentation.variant: text` and `content.blocks`.
- Repetition is permitted only for `custom`; all entries, including disabled ones, share the ID uniqueness domain.
- Block array order is authoritative. C2 needs no persistent block IDs because blocks have no independent anchors, files or cross-references.
- Preserve existing built-in lifecycle/navigation/presentation data. New custom entries do not expose lifecycle or nested navigation children in C2.

## 3. Example JSON

Illustrative proposed version-2 page, not a replacement for current editorial content:

```json
{
  "schemaVersion": 2,
  "kind": "single-page",
  "sections": [
    {
      "id": "sobre",
      "type": "sobre",
      "enabled": true,
      "order": 1,
      "navigation": { "visible": true, "label": "Sobre" },
      "presentation": { "variant": "default" }
    },
    {
      "id": "custom-123e4567-e89b-42d3-a456-426614174000",
      "type": "custom",
      "enabled": true,
      "order": 2,
      "title": "Pesquisa aberta",
      "navigation": { "visible": true },
      "presentation": { "variant": "text" },
      "content": {
        "blocks": [
          { "type": "heading", "text": "Resultados" },
          { "type": "paragraph", "text": "Conhecimento produzido pelo laboratorio." },
          { "type": "list", "ordered": false, "items": ["Estudos", "Materiais"] },
          { "type": "link", "label": "Universidade", "url": "https://ufrj.br/" },
          { "type": "button", "label": "Consultar materiais", "url": "https://ufrj.br/" }
        ]
      }
    },
    {
      "id": "custom-123e4567-e89b-42d3-a456-426614174001",
      "type": "custom",
      "enabled": false,
      "order": 3,
      "title": "Acervo",
      "navigation": { "visible": true, "label": "Materiais" },
      "presentation": { "variant": "text" },
      "content": { "blocks": [] }
    }
  ]
}
```

## 4. ID and Anchor Rules

- Generate `custom-` plus lowercase UUID v4 using the available `crypto.randomUUID()`. Regenerate on a detected collision; never derive identity from a title.
- Exact custom ID format: `^custom-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (43 ASCII characters).
- IDs are immutable after creation, including disabled instances. No ID-edit UI or ID-renaming migration in C2.
- Section DOM ID equals instance ID; heading ID is `<id>-title`; renderer container ID is `<id>-content`. Reserve the `custom-` namespace for custom instances and their descendants.
- Validate uniqueness against all entry IDs and generated/reserved DOM IDs: built-in section/container IDs, nested renderer IDs, `top`, `main-content`, `main-navigation`, `contato`, and other fixed page anchors. Reject collisions, including legacy built-in IDs occupying this namespace.
- Custom navigation targets `#<id>`. Existing built-in anchor mapping stays unchanged (for example, Publicacoes entry ID and its DOM anchor need not match).
- Absent `navigation.label` means derive from the current title; an explicit label remains independent of title edits. Do not persist a derived label as an explicit override.

## 5. Validation and Normalization Rules

All limits below are proposed policy limits requiring approval, not existing restrictions.

| Field | C2 rule |
| --- | --- |
| Page version/kind | Version 1 or 2 only; `kind` must be `single-page`. A custom entry without version 2 is invalid, not inferred/upgraded on load. |
| Custom identity/type | Required valid immutable ID and literal `custom`. |
| `enabled`, `order` | Required boolean and positive integer for custom entries. Validate before canonical reindexing; no string-to-boolean/number coercion. |
| `title` | Required nonblank plain text, at most 120 Unicode code points. |
| `navigation` | Optional; missing `visible` defaults to false on import. Creation UI may explicitly choose true. Optional nonblank label at most 60 code points; absent label derives title. Custom children are not supported. |
| `presentation` | Optional default `{ "variant": "text" }`; any other custom variant fails. Built-in variants retain existing semantics. |
| `content.blocks` | Required array, 0-100 blocks per custom instance; empty section is valid and renders its title. |
| `heading` | Exactly `type`, `text`; nonblank text up to 160 code points. Render as h3, not arbitrary heading levels. |
| `paragraph` | Exactly `type`, `text`; nonblank plain text up to 4,000 code points. |
| `list` | `type`, `items`, optional boolean `ordered` default false; 1-50 plain-text items, each nonblank and at most 1,000 code points. No nested blocks. |
| `link` / `button` | Exactly `type`, `label`, `url`; nonblank label up to 120 code points, URL up to 2,048 characters. Button means a styled navigation link, not executable behavior. |
| Aggregate limits | At most 50 custom instances, 100 page entries and 500 custom blocks in total; version-2 page at most 1 MiB serialized UTF-8. Disabled content counts too. Do not retroactively impose these new aggregate limits on legacy-only pages. |

Reject duplicate IDs/types, unsupported types/versions, unknown fields, unknown variants, malformed values, and over-limit content before producing a writable composition. Known legacy fields remain recognized; unrecognized legacy extensions also require refusal, not silent deletion. Normalize only validated data: deterministic ordering and documented defaults, preserving all supported metadata and text. Do not truncate text or sanitize away fields to make validation pass.

On load failure, retain raw input on disk unchanged, expose diagnostics, and do not create a writable reduced draft. The project is incompatible/invalid for editing, build and remote update/publication; it may still be closed or replaced through existing guarded open operations. On save failure, preserve the existing draft and baseline semantics. A read-back failure may occur after a disk write: report failure without claiming rollback.

URL policy: use structured URL parsing and the existing sanitizer as an extension point. C2 custom links allow absolute `https:`/`http:` URLs without userinfo and simple single-address `mailto:` URLs without query/header injection. Reject control characters, backslashes, protocol-relative URLs, other schemes and relative paths. Fragment links may reference known static anchors or persisted section anchors; disabled targets render as plain labels until active again. Validate against the complete page after editing, not just one block. No new-tab option in C2; links use normal same-context navigation.

No schema fields may carry HTML, CSS, event handlers, scripts, Markdown programs or iframe markup. Unknown such fields/block types fail validation. Plain-text fields are never parsed as markup: text resembling tags is displayed literally and cannot execute. This preserves literal academic text without a brittle HTML-detection blacklist.

## 6. Compatibility and Versioning Policy

| Case | Required behavior |
| --- | --- |
| New editor opens old built-in project | Accept known version-1 semantics in memory; do not write on open. |
| New editor saves old built-in project | Preserve unversioned/version-1 representation unless custom creation was explicitly requested. No bulk migration. |
| First custom creation | Stage version 2 with the instance in the same draft. Explicit composition Save writes both atomically. Discard restores the old version and content together. |
| New editor opens supported version 2 | Strictly validate the complete page, then allow editing. |
| New editor encounters future version or unsupported capability | Refuse editable load and destructive save; preserve raw data. Never downgrade, omit unsupported blocks, or substitute defaults. |
| New editor saves version 2 with all custom sections disabled | Keep version 2 and every disabled section/block. No automatic downgrade. |
| Pre-C2 editor opens/saves version 2 | Unsafe; see the release gate below. The version field cannot enforce refusal in software that ignores it. |

A page-level version is sufficient; no second feature-history store, migration framework or per-block version is proposed. Adding a block/layout or changing meaning later requires a version bump and an explicit supported-version check. Compatibility-aware versions must reject unknown fields even if the version number was incorrectly left unchanged.

The guard must run at raw project load, draft command/validation, pre-write, raw read-back, build consolidation and public/preview input boundaries. Equality must include the version and full custom content; it must not normalize invalid read-back into an apparently matching page. Missing legacy-page fallback does not authorize fallback for an existing malformed or unsupported page.

## 7. Older-Editor Safety Rule

Current source demonstrates a destructive path: `loadEditorSiteModel` and service load call `normalizePageComposition`; unknown `custom` entries are filtered, and their version/title/content are lost. A subsequent save receives only supported built-ins, passes validation and can overwrite `content/page.json` with that reduced data. Direct save of raw unsupported entries may reject, but that does not protect the normalize-on-load path. Existing read-back verifies the reduced result, not the original custom data.

Exact historical packaged behavior is unverified: individual binaries may contain other source revisions. Treat every package without verified version-2 support as incompatible; do not claim that all historical packages refuse or corrupt data identically.

**Release gate:** before any custom data reaches a real editable server project, inventory maintainers, upgrade all to a tested compatible package, retire old launch shortcuts, and retain a pre-feature editable-source backup. Confirm compatible build/preview and disposable source round-trip results. Do not enable custom production content if incompatible editors can still be used to edit that project.

This is an operational release guarantee, not technical enforcement against arbitrary old binaries. If the maintainer requires automatic protection from uncontrolled legacy binaries, the requirement is not achievable by a JSON marker alone; stop rollout and request a separate protection design. Packaging and production rollout are separate authorized runs, not C0/C2 side effects.

## 8. Persistence Choice and Rationale

Choose A: blocks and composition together in `content/page.json`. The current service already owns atomic write, read-back and comparison of this file, and source transport already carries it. Separate per-section files would create coupled saves, orphan cleanup and remote deletion/recovery obligations with no benefit for bounded text.

Both Page creation/ordering and Content custom-block editing operate on the same `draftComposition` and `compositionDirty` state. Custom Save from either tab invokes the same composition save path for the entire page draft, including pending order/title changes. Custom discard restores that same complete baseline, not just one section. This whole-page save/discard scope must be visible in action labels; no second custom-content dirty flag or hidden record save.

Existing built-in content records retain their current save paths and dirty state. Saving custom composition must not save/discard pending built-in edits, or vice versa. Build/source/publication readiness remains derived from the existing dirty/busy guards. Custom edits must trigger the existing revision/receipt invalidation just like composition edits today.

## 9. Disable and Delete Policy

C2 supports disable and re-enable only. Disabling retains ID, title, navigation choices, layout and every block. Re-enable operates by instance ID and uses C1 placement semantics among active built-ins/custom instances. Removing blocks within an unsaved custom draft is reversible by the existing whole-page discard until save; it is distinct from permanent section deletion.

Defer permanent section deletion and ID reuse. Keep disabled instances selectable for editing/recovery, but exclude them from public section DOM and navigation. Validate disabled content too; never hide incompatible content from validation merely because it is disabled.

## 10. Minimal C2 UI Flow

Creation belongs in Pagina: choose Nova secao personalizada, enter title, choose navigation visibility/optional label and placement, then create an in-memory instance with an empty block array. Cancel changes nothing. No automatic save or publication.

Conteudo lists custom instances by title, distinguishing equal titles without requiring raw IDs. Select an instance to edit only the supported blocks through ordinary fields and add/remove/up/down controls. Title/navigation can remain in Pagina; custom block edits and Page edits share one draft. Save/discard uses the whole-page scope described above. Existing built-in record controls remain unchanged.

Pagina retains disable/re-enable, C1 placement and move controls. Built-in add remains unique by type; custom creation and re-enabling existing custom instances are separate commands so an enabled custom instance never prevents creating another. Placement targets are stable active instance IDs, not array indices or renderer types.

## 11. Rendering Contract

One controlled custom-text renderer, preferably extending `SectionRenderer`, serves preview and production. Extend the existing registry factory to supply an instance/container; do not create a competing renderer registry or direct JSON access inside renderers.

- Create a semantic `section` with stable instance ID, h2 title and `aria-labelledby` pointing at its instance-specific title ID.
- Render ordered blocks as h3, p, ul/ol with li, or a. CTA uses an a styled through existing button classes; it does not become a scriptable button.
- Build DOM with text nodes/`textContent` and validated URL assignment. No HTML passthrough, runtime evaluation or external renderer dependencies.
- Shared instance-aware anchor/container resolution is used by composition application, navigation, preview and public entry points. Keep fixed built-in IDs and renderer behavior intact.
- Render data comes from the validated composition delivered through the existing adapter; production consolidates the same page under `public/data.json`, not a new endpoint.
- Include each enabled instance exactly once in composition order. Navigation visibility follows its own flag and links to that instance, not the `custom` type. Preserve built-in dropdown behavior; no new custom dropdown editor in C2.
- Scope preview DOM ownership to its container; clean up stale custom nodes/listeners before rerender. Do not let preview refresh move or delete another page's nodes.
- Use existing typography, spacing, keyboard focus and contrast. Heading levels are fixed; no user-authored CSS/layout or inline event attributes.

## 12. C2 Acceptance-Test Matrix

1. Legacy built-in fixtures open/save without schema upgrades or editorial changes; C1 omitted and explicit placement remain compatible.
2. Create one then two custom instances; IDs are unique and stable, including after title/nav-label edits and reopen.
3. Place/re-enable custom instances at beginning/middle/end among built-ins and custom instances; reject stale, disabled, self and corrupt targets without mutation.
4. Save, verify raw read-back and reopen preserve version, title, navigation, every block value and order. A changed block alone makes the draft dirty and defeats equality with the old baseline.
5. Write failure, malformed read-back, different block content and lost version/unknown fields preserve draft/baseline and never report success or rollback falsely.
6. Disable/re-enable retains all content and identity; disabled sections/nav items are absent from preview/public DOM. No duplicate anchors, containers or built-in types.
7. Preview and production render matching section/block/navigation order for two same-type instances; repeated preview does not duplicate nodes/listeners.
8. Unknown version/type/block/variant/field, duplicate or reserved ID, wrong value types and boundary-size violations fail without truncation or destructive normalization, including disabled content.
9. Script-like text remains literal; executable schema fields and unsafe URLs fail. Safe URLs, CTA anchors, heading structure, focus and long text work in preview and production.
10. New editor reads legacy pages, stages upgrade only on custom creation, and restores legacy version on discard. Compatibility-aware old readers reject future versions; a fixture demonstrates pre-guard stripping to document why the operational package gate is mandatory.
11. Custom and built-in dirty drafts coexist without cross-saving/discarding. Custom edits invalidate B2 receipts/preview; source update still does not require build/review.
12. Consolidation/build preserves version-2 data through the adapter; malformed/unsupported existing page prevents generating a silently incomplete site. Disposable local source round-trip preserves the full page without new transport formats or real FTP writes.

## 13. Files Likely to Change in C2

- `src/js/page/composition.js`, `section-registry.js`, `navigation.js`: strict versioned schema, identity/anchors, instance-aware renderer factory.
- `src/js/editor/composition-commands.js`, `composition-service.js`, `project-loader.js`: lossless drafts, creation/re-enable, compatibility refusal, complete read-back/equality.
- `src/js/editor/bootstrap.js`, `content-editor.js`: Page creation and Content block controls sharing the existing composition owner.
- `src/js/editor/composition-preview.js`, `src/js/main.js`: instance-aware shared rendering and correct custom data routing.
- New `src/js/sections/custom.js` (suggested name), plus tightly scoped existing CSS rules if existing styles are insufficient.
- `scripts/build-data.js`: validate existing page input before consolidation. Keep validation imports usable in Node without browser globals or side effects.
- Existing composition, project-loader, preview, content and build-data tests; focused custom-renderer/compatibility tests using the same framework.

`DataAdapter`, `JSONAdapter`, `desktop-host.js` and native FTP/filesystem/credential modules should not require redesign. Verify the existing adapter pass-through and transport with fixtures; edit those modules only if a concrete compatibility gap is proven. Do not modify real `content/page.json` merely to exercise the feature.

## 14. Explicit C2 Non-Goals

No custom HTML/CSS/JavaScript, Markdown execution, images, embeds, Instagram, video, cards, columns, tables, arbitrary layouts, drag-and-drop, permanent section deletion, new backend/database, separate custom files, migration framework, mobile redesign, dependency cleanup, B3 help, packaging, GitHub or production publication.

## 15. Decisions Requiring User Approval

1. Approve the single-file version-2 shape, five text block types and one text layout; no custom `navLabel`/string-layout parallel fields.
2. Approve immutable generated UUID-based IDs, proposed limits and conservative URL policy.
3. Approve one whole-page draft/save/discard owner across Pagina and custom items in Conteudo; built-in record saves stay independent.
4. Approve disable-only sections and the mandatory compatible-package/backup release gate. Accept that unmodified old binaries cannot be forced safe by the new document schema.

Recommended first implementation step after approval: C2 compatibility/validation and complete save/read-back preservation using fixtures only, followed by the existing shared rendering and minimal UI slices. C2 is not accepted until two custom instances pass the complete matrix. No implementation begins automatically after C0.
