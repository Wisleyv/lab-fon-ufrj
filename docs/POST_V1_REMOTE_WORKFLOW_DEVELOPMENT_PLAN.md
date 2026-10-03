# Post-v1.0 Remote Workflow Development Plan

## Status and scope

This document defines the development phase that follows the accepted post-v1.0 public-site polishing milestone.

Planning baseline:

- branch: `work/post-v1.0-hardening-2026-10-02`;
- baseline commit: `8274a88 feat: reconcile and polish post-v1 site`;
- production remains a static website hosted through FTP;
- the installed Lab-FON Editor remains separate from the editable website project;
- no phase may silently delete remote files or combine unrelated changes.

The inventory in `docs/backup_inventory.md` is the primary structural evidence for the current remote account. It records approximately 73.52 MB under `/source/` and 73.08 MB under the published root. In both locations, the corresponding image tree accounts for approximately 72.8 MB. This is not principally an accidental nested copy inside `/source/`: the current architecture keeps source assets under `/source/public/` and reproduces them in the generated public site. The actionable problems are the oversized source boundary, probable stale or orphaned media, repeated transfer of unchanged assets, and Editor artifacts leaking into public output.

## Target architecture

The intended separation is:

```text
remote /source/       = portable editable website project
installed Editor      = tool that edits, validates, builds and publishes the project
remote /              = generated public website only
```

The remote source is not a repository clone and must not be used to distribute the Editor itself. Before excluding any existing path, implementation must verify that project validation, content editing, local build, preview and publication do not depend on it.

## Project boundaries

The definitive manifests will be established through tests and a dry-run comparison before remote cleanup. The working classification is:

| Class | Purpose | Intended treatment |
|---|---|---|
| A | Canonical structured content, primarily `content/**` | Retrieve and update as editable source |
| B | Public-site build/runtime source, configuration and required build scripts | Retrieve and update through a positive source manifest |
| C | Generated public output, primarily `dist/**` | Publish to `/`; never store as canonical source |
| D | Editor-only web UI, Electron host code and packaging material | Distribute with the installed Editor; exclude from source and public manifests |
| E | Tests, documentation, Git metadata, release files, dependencies and temporary files | Keep in development; exclude remotely |
| F | Fixed and user-managed media | Include only when fixed by manifest or referenced by canonical content |

Retrieval and source update must consume the same source-manifest definition. Publication must consume a separate public-output manifest. A path must not be admitted merely because it happens to exist beneath a broad directory.

## Recorded product decisions

### Editor identity

The Portuguese application menu and a restrained, on-demand **Sobre** dialog remain planned. The dialog must obtain its version from Electron's `app.getVersion()` and use the credit:

`Desenvolvimento do Editor: Wisley Vilela`

ORCID must not appear in the Editor. The essential user links are:

- `Guia do usuário`: `https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md`;
- `Baixar a versão mais recente`: `https://github.com/Wisleyv/lab-fon-ufrj/releases/latest`.

The repository link is optional and should be omitted unless it provides a concrete user benefit. External navigation must use a narrow, HTTPS-only desktop bridge rather than exposing unrestricted shell access.

### Publication workflow

The target user experience is one guided **Atualizar site** operation, while retaining explicit internal stages and receipts:

```text
validate -> back up -> update /source -> build -> verify -> publish / -> verify
```

This unified action must not be implemented before backup and recovery are proven. Until then, the existing source-update and publication controls remain separate.

If source update succeeds and public publication fails, the newest source remains authoritative. The previous public site must remain available or be restored, and the Editor must offer a publication retry from the same source revision. Source must not be rolled back automatically merely because publication failed.

### Backup policy

Source and public snapshots are separate artifacts associated with one transaction ID. Local backups are mandatory before remote mutation. Persistent remote backups are allowed only if hosting provides a private location outside the document root and quota is verified. Otherwise, remote staging is temporary and bounded.

Backups need timestamped names, manifests, checksums, operation status, retention limits and a tested restore path. Backup/recovery is a prerequisite for orphan cleanup and workflow unification.

### Transfer model

Progress reporting must describe useful work, not only bytes already transferred. The desktop layer should publish a structured model containing:

- operation and phase;
- discovered and completed file counts;
- transferred and total bytes;
- percentage when the total is known;
- rolling transfer rate;
- a stable ETA only after sufficient samples;
- determinate/indeterminate state and current path when appropriate.

The two FTP workers must update one aggregate counter without double counting. Discovery should retain remote sizes so total work is known before downloading.

The optimization target is not merely a well-described 73 MB download. After source-boundary and asset-audit work, retrieval should reuse unchanged local assets. The manifest design must therefore support at least path and size, and preferably a content hash generated during source update. If no trusted hash is available remotely, size and modification time may identify candidates, but integrity-sensitive reuse requires local verification or download.

## Execution phases

| Phase | Issue | Proposed change | Main files/components | Verification gate | Risk/dependency |
|---|---|---|---|---|---|
| 1. Public-build isolation | Editor entries currently enter public `dist` | Define a positive public-build entry/artifact boundary, separate from the Editor build; reject Editor artifacts during publication validation | `vite.config.js`, `package.json`, build/publication validation in `desktop/main.cjs`, build tests | Public build contains required site files and no `editor.html`, Editor JS/CSS, Electron material or future unapproved entry | First implementation pass; no FTP mutation |
| 2. Portable source boundary | `/source/` is treated as a broad repository-shaped bundle | Define one positive source manifest shared by retrieval and update; prove the portable project can edit, build, preview and publish without Editor source | `desktop/main.cjs`, a focused manifest module, retrieval/build tests | Round-trip fixture passes; retrieval and upload manifests are symmetrical; excluded paths are rejected | Must verify every current validation/build dependency |
| 3. Asset reference audit | Media dominates both trees and may contain stale files | Build a dry-run inventory of fixed assets, canonical references, missing assets, same-content duplicates and unreferenced candidates | Manifest/audit helper, `scripts/build-data.js`, content/image tests | Report is deterministic; no deletion; every retained reference resolves | Classification may reveal legacy exceptions |
| 4. Small Editor UX | Team selection is filesystem-ordered; native identity is incomplete | Add pt-BR alphabetical team browsing and Portuguese menu/Sobre dialog | `content-editor.js`, `desktop/main.cjs`, `preload.cjs`, focused CSS/tests | Accent/case sorting preserves record IDs and selection; menu/version/links are tested and keyboard accessible | Low risk; scheduled before transaction work |
| 5. Backup and recovery | Remote mutation lacks a complete recovery contract | Create transaction-scoped local source/public snapshots, manifests, checksums, retention and explicit restore/retry behavior | Desktop backup service, preload/host bridge, publication state and tests | Simulated failure at each stage preserves or restores the correct source/public state | Required before Phases 7 and 8 |
| 6. Retrieval and progress optimization | Every retrieval transfers mostly unchanged media and gives incomplete progress | Record discovery sizes, expose aggregate progress/rate/ETA, and reuse verified unchanged local assets | FTP retrieval, progress IPC, `desktop-host.js`, `bootstrap.js`, retrieval tests | Two-worker totals are exact; stalled/unknown-size cases degrade safely; changed files are never skipped | Reassess after Phase 2 measures the reduced source |
| 7. Guided update workflow | Two operations are error-prone for non-technical users | Compose existing guards into one staged, resumable **Atualizar site** transaction with receipts and retry | `publish-service.js`, `bootstrap.js`, native source/build/publication handlers | Every stage and partial-failure path is tested; no stale build or mismatched revision can publish | Depends on proven backup/recovery |
| 8. Controlled remote cleanup | Obsolete Editor/public files and confirmed orphan assets remain remotely | Present reviewed cleanup manifest, back up, remove only confirmed candidates, republish and remeasure | Guided maintenance operation and manifests | Human-approved candidate list; restore rehearsal; public smoke test; retrieval size/time comparison | Highest risk; explicit confirmation required |

## Phase 1 implementation contract

Only Phase 1 is authorized as the next implementation slice.

It must establish a positive public-build boundary rather than merely deleting `editor.html` after a build. The public build should start from approved public entries and generate only files needed by the static site. The Editor build should continue producing the installed application's renderer assets through its own explicit mode or configuration.

Phase 1 must:

1. identify the current site and Editor build entry points and their shared chunks;
2. separate public and Editor build inputs without duplicating application logic;
3. ensure normal `npm run build` produces public-site output only;
4. ensure `npm run editor:build` still has the Editor entry and required packaged assets;
5. make publication validation fail closed if Editor-only artifacts appear in public `dist`;
6. add focused tests for the positive artifact boundary and preserve current build behavior;
7. run the relevant tests and both production and Editor build verification required by the project instructions.

Phase 1 must not:

- alter `/source/` contents or the source bundle;
- delete or relocate image assets;
- perform FTP operations;
- implement backup/recovery or unified publication;
- add transfer caching, progress/ETA UI, menus, Sobre, or team sorting;
- publish, tag, release or merge the project.

## Phase gates and change discipline

Each phase is an independently reviewable change with focused tests and a clean Git checkpoint. A later phase starts only after the previous phase's acceptance criteria are met and the maintainer requests it.

Before any destructive remote operation:

1. the public and source boundaries must be stable and tested;
2. the asset audit must distinguish confirmed references from candidates;
3. backup creation and restoration must be demonstrated;
4. the cleanup manifest must be shown for explicit approval.

The full suite and relevant builds are required when a phase changes shared build, transfer or publication behavior. Narrow UI phases may begin with focused tests, followed by the project-required regression checks before their checkpoint.

## Deferred questions

The following are deliberately unresolved until their owning phase:

- the exact fixed-asset allowlist and orphan-media retention policy;
- whether remote file metadata is reliable enough for safe unchanged-file reuse;
- whether the server supports private backup storage or dependable atomic rename;
- the retention count and storage ceiling for local backup transactions;
- whether the repository link adds value in the Sobre dialog.

None of these questions blocks Phase 1.
