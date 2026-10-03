# Manual acceptance build repair

Implemented in `C:/Temp/labfonac-post-v1.0`, preserving accepted uncommitted Phases 1-8. Broader manual acceptance remains paused.

## Repair boundary

`desktop/portable-build.cjs` prepares workspace-local dependencies with the existing locked `npm ci` operation before attempting a Vite build. An inherited executable is no longer treated as proof that the retrieved project can resolve its own dependencies. Missing lockfiles, failed installation, or installation without Vite block generation. Existing local Vite dependencies are reused.

The Editor copies its owned `portable-vite.config.mjs` into `node_modules/.labfon-build/` and invokes the project's existing build/prebuild scripts with that wrapper. The wrapper loads the retrieved configuration and preserves its public settings, but replaces the obsolete entry list with `index.html` and fixes output to local `dist`. Native subprocesses disable Editor-build mode and inherited external output destinations. Existing public artifact validation still rejects Editor leakage.

There is no canonical source migration: retrieved `vite.config.js`, package metadata, content, and source assets remain unchanged. Dependencies and the wrapper cache remain local and outside the positive source manifest. `public/data.json` and `dist` are generated outputs. No Editor entry is reintroduced into source or public output.

The native window now receives the existing `build/icon.ico`; the same asset is explicitly included in the package file list. No packaging was performed. Visual Windows icon acceptance remains a manual check.

## Evidence

- A disposable copy of the actual retrieved workspace started with no dependencies and the legacy configuration requiring `editor.html`. The repaired native `runProjectBuild` installed its locked dependencies and returned `BUILD_SUCCEEDED`, with `dist/index.html` and `dist/data.json` validated. No Editor entry was restored. All portable source bytes remained identical to the original workspace.
- 78 focused tests passed across portable preparation/icon (7), native build (9), guided update (15), publication (9), and source manifest (38).
- The focused portable retrieval/edit/build/preview/simulated-publication round trip also passed (1 test; 31 unrelated retrieval tests skipped).
- Tests cover preparation order, no unnecessary reinstall, missing lockfile, failed or incomplete installation, genuine build failures, legacy entries, unchanged config/content, public-only output, inherited Editor/output environment isolation, icon assignment and package inclusion.
- Editor renderer and public production builds succeeded; final `dist` is public-only. `git diff --check` passed. Existing asset/source/public/recovery policies were not weakened.

Dependency installation reported 22 vulnerabilities in the existing legacy dependency tree. No audit fix, upgrade, or lockfile redesign was attempted. First-time generation needs registry access and may take longer while `npm ci` prepares the local workspace.

## Next manual step

Close the running development Editor, stop its terminal with Ctrl+C, and restart `npm run editor:dev` from `C:/Temp/labfonac-post-v1.0`. Reopen the same saved disposable remote project without changing connection settings or retrieving again. Save or discard any pending edits. In `Revisar`, test only `Gerar site` and then the local generated preview; also check the native window icon. No manual config edits or dependency installation should be needed.

Do not press `Atualizar site`, recovery, or remote maintenance controls in this local repair retest. Report its result before resuming the broader acceptance sequence. A saved project may contain obsolete site source/design; this compatibility repair does not silently replace it with the development checkout.

No real FTP access, remote mutation, production publication, asset cleanup, packaging, commit, or push occurred. Publication/retrieval verification used disposable filesystem-backed client doubles only. The active managed workspace was not modified by the repair verification.
