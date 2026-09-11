# Project Sanitization Report - September 11, 2026

## Outcome

Conservative, reversible local cleanup completed. Archived **333 original files (784,007,576 bytes, approximately 748 MiB)** under `.sanitization-backup/2026-09-11/`, preserving their original relative paths. No original file was permanently deleted. No application logic, canonical content, maintained assets, package dependencies, or deployment credentials were changed.

The verification described below found no remaining cleanup regression. This is evidence for the tested local scope, not an absolute guarantee about every external environment. Production and remote `/source/` were not modified. No commit, staging operation, or GitHub push was performed.

## Current Architecture and Structure

The September 7 release established the static Vite site and packaged Windows editor. Current dependencies remain: structured `content/` -> JSON consolidation/adapter -> renderers -> static build. Desktop IPC and services implement explicit local save, remote-source synchronization, build/preview, and FTP publication.

| Location | Classification and disposition |
| --- | --- |
| `content/` | Canonical structured data, including disabled/historical sections; retained unchanged |
| `src/js/`, `src/css/`, `src/assets/` | Site/editor code, styles, and assets; retained unchanged |
| `public/assets/`, `public/data.json`, `public/publication_references.json`, `public/.htaccess` | Maintained static inputs/output and hosting configuration; retained |
| `desktop/`, `editor.html`, `index.html` | Native host and entry points; retained unchanged |
| `scripts/build-data.js`, `scripts/editor-smoke-ftp.cjs` | Current build and verification tools; retained |
| Other retained `scripts/` | Encoding/publication utilities; not assumed obsolete merely because not in npm scripts |
| `tests/` | All 176 tests retained; one scratch-directory setup correction |
| `package.json`, lockfile, `vite.config.js` | Build/test/package configuration; only archive isolation added to Vite |
| `.github/`, deployment PowerShell scripts | Existing automation and fallback deployment tools; retained, not executed |
| `docs/`, root Markdown documents | Project history, plans, source material, and instructions; retained |
| `.vscode/`, workspace file, `.venv/` | User tooling; retained. Python publication utility imports BeautifulSoup |
| `node_modules/`, regenerated `dist/`, fresh `tmp/` | Dependencies, build output, test scratch space; not canonical source |
| `.env.deploy`, `docs/ftp_access.md` | Private local configuration; retained under existing ignore rules, contents not disclosed |
| `.git/` | Source-control metadata; untouched |
| `.sanitization-backup/` | Ignored local archive, manifests and audit evidence; excluded from tests and Vite serving |

Historical documentation remains project material even when it describes rejected WordPress/CMS approaches. It was not broadly moved because that would discard useful context and break documentation references. `docs/DEVELOPMENT_LOG.md` remains authoritative; the root `DEVELOPMENT_LOG.md` is historical. Ambiguous assets were retained rather than guessed unused.

## Plan and Execution

1. Read current configuration and release handoff; inspect runtime, script, test, and documentation references.
2. Establish baseline tests and web build; record SHA256 hashes and original Git status before moving anything.
3. Add the root archive ignore rule before creating the archive. Exclude it from test discovery and dev-server access.
4. Validate absolute source/destination containment inside the checkout/archive, reject linked destinations and overwrites, and move the reviewed items with native PowerShell operations.
5. Verify archived hashes and retained-file hashes, parse retained JSON, syntax-check all source/test JavaScript, scan documentation links, rerun tests/builds, and compare generated output.

## Archived Items

Every path below now exists beneath `.sanitization-backup/2026-09-11/` with the same relative path.

| Original path | Files | Reason |
| --- | ---: | --- |
| `release/` | 74 | Superseded local packaging output, including `win-unpacked.tmp`; not the verified external release |
| `release-verify/` | 73 | Superseded verification packaging output |
| `tmp/` | 181 | Old retrieval snapshots, test data and transient editor/server state; not the app-managed canonical workspace |
| `public/admin/` | 2 | Netlify CMS entry/configuration superseded by the tested desktop maintainer workflow; no active runtime dependency found |
| `public/publication_references.backup.json` | 1 | Historical cleanup backup, not the current references dataset; the retained Python utility writes this path as output, not required input |
| `scripts/migrate-data.js` | 1 | Completed one-time migration into `content/`; no current build/test caller |
| `data-backup.json` | 1 | Input belonging to that completed migration; archived with its script |

`manifest.json` contains original paths, sizes and SHA256 hashes; `moves.txt` records the seven moves. `verification-scratch/` holds scratch-directory structure generated during checks and moved aside to prove tests work without a pre-existing `tmp/`. `audit/` contains the before/after inventories and scan evidence. These are local-only, not distributable project assets.

## Supporting Changes

- `.gitignore`: ignores `/.sanitization-backup/`, `/release/`, and `/release-verify/` so regenerated package output is not accidentally committed.
- `vite.config.js`: preserves default Vitest exclusions and adds the archive; preserves Vite's current default filesystem deny rules and adds the archive.
- `tests/unit/editor-publication.test.js`: explicitly creates its scratch parent before `mkdtemp`. The first post-move run exposed its dependency on the old `tmp/`; this setup fix preserves every assertion and makes a clean checkout work.
- `docs/content-update-options.md`: adds a historical-status note and archive/report pointer. Historical session entries are not rewritten.
- This report and `docs/DEVELOPMENT_LOG.md`: record cleanup evidence and safe continuation.

## Verification Results

| Check | Result |
| --- | --- |
| Baseline full suite | 23 files, 176 tests passed |
| Initial post-move suite | 175 passed; one test needed an existing scratch parent. Corrected as described above |
| Focused publication suite after fix | All 7 tests passed |
| Final full suite with `tmp/` moved out first | 23 files, 176 tests passed |
| Original archive integrity | All 333 archived original files match baseline SHA256 |
| Retained-file integrity | 265 baseline retained files checked; only explicitly listed configuration/test/documentation edits allowed |
| JSON scan | Retained project JSON parsed successfully, including existing empty-string keys |
| JavaScript syntax scan | All 60 source, desktop, script and test JS/CJS files passed `node --check` |
| Production web build | Passed before and after cleanup |
| Build equivalence | All 72 retained output files byte-identical; only `admin/index.html`, `admin/config.yml`, and `publication_references.backup.json` removed |
| Desktop-mode build and Electron packaging | Passed; validation-only artifact at `C:\labfon-editor-release\sanitization-2026-09-11\win-unpacked\Lab-FON Editor.exe` |
| Archive isolation | `git check-ignore` passed; no archive paths tracked; actual Vite request returned HTTP 403; test exclusion confirmed |
| Documentation references | No existing local Markdown link broken by moves; one pre-existing link to nonexistent `data/` in `EVALUATION_Architecture_and_Best_Practices.md` retained for a separate documentation task |

The full file scan covers maintained project files, including hidden configuration, but not dependency internals (`node_modules/`, `.venv/`), Git internals, or regenerated build output as source. Build output was separately compared. This was not a malware scan, dependency-security audit, or a new live production acceptance cycle. The validation package was not promoted or used for remote editing/publication. The existing verified September 7 package remains untouched.

## GitHub and Deployment Caution

Five formerly tracked files now appear as deletions at their original paths; their backups are intentionally ignored, so Git will not represent them as tracked renames. The large pre-existing dirty worktree was preserved. Do not use a blanket reset, add, commit, or push without reviewing both the prior release work and these cleanup changes.

**The existing `.github/workflows/deploy.yml` automatically deploys on a push to `main`.** It currently declares Node 18 and FTP destination `/labfonac/`, whereas the verified desktop workflow used publication root `/`. These settings were not altered or tested against the server in this cleanup. Review that workflow and the intended content baseline before any GitHub update; a push must not silently become an unintended production publication.

The archive is a same-machine backup, not protection against disk failure. Keep a separate protected copy before disposing of local history. It may contain private transient configuration; do not force-add or publish it.

## Restoration and Next Action

To restore an item, consult `manifest.json`, verify its archived hash, and move only the selected archived path back to its original relative path after confirming the destination does not exist. Create missing parent directories first. Never overwrite current content or restore the entire old `tmp/` tree over a new workspace. Restore the migration script and its data backup together if historical reproduction is explicitly required. Run relevant tests/builds after restoring an executable input.

Next action: review this local cleanup diff and the pre-existing release changes, then explicitly decide how to update GitHub without triggering an unreviewed deployment. No further cleanup or deployment is automatic.
