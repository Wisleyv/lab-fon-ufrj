# Equipe Canonical No-Photo Retest

## Current Rule

`team-placeholder.svg` is the sole canonical no-photo visual. `avatar.webp` is an ordinary assigned image reference and may be removed/replaced like any other photo. Empty/absent `foto` and an explicitly stored canonical SVG path count as no-photo. All other non-empty image references, including the old `placeholder-avatar.jpg` path, remain removable. Unavailable images retain the existing visual fallback without rewriting their reference.

This clarified requirement supersedes the interpretation documented at `3bf7fde`. It does not authorize automatic migration of existing records or deletion of binaries. Mayara's current `content/equipe/mayara-gak-assump-uo.json` stores `assets/images/avatar.webp`; under the corrected rule Remove must be visible. No name-specific logic is used.

## Update One Application File

Use the new completion-report commit on `chore/verified-editor-cleanup-plan-2026-09-11`, not `3bf7fde`. Close Electron and stop the old `npm run editor:dev` process with Ctrl+C. From the maintained Git checkout, verify HEAD and export only the changed helper:

```powershell
git log -1 --oneline
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$archive = Join-Path $env:TEMP "labfonac-photo-semantics-$([guid]::NewGuid()).zip"
git -C $source archive --format=zip --output=$archive HEAD src/js/sections/team-photo.js
if ($LASTEXITCODE -ne 0) { throw 'Export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

This replaces only `src/js/sections/team-photo.js`. Preserve any independent edits to that helper first. It leaves `content/`, images, dependencies and metadata untouched. The disposable copy must already have the `42f845c` application. Confirm an Electron window opens; a browser tab alone is not the desktop app. Do not reinstall dependencies or export the entire project.

## Thirteen Checks Only

1. Open `C:\Temp\labfonac-c2` through Projeto -> Opcoes avancadas -> Abrir projeto local. In Conteudo -> Equipe, select Mayara.
2. Confirm her current reference is `assets/images/avatar.webp`. If it has already been explicitly changed, record the actual value rather than overwriting it to match this guide.
3. Confirm `Remover foto` is visible for that reference and the assigned image is displayed normally.
4. Click Remove.
5. Confirm the single neutral icon appears and the photo status says `Sem foto.`.
6. Confirm content/global dirty state and enabled Salvar conteudo; disk JSON must still have the prior reference.
7. Click Descartar alteracoes. Confirm `avatar.webp` and Remove return.
8. Remove again and click Salvar conteudo.
9. Inspect the exact JSON file named in the local save status. Confirm `"foto": ""`. Confirm `public/assets/images/avatar.webp` still exists; no other member JSON should change.
10. Use Fechar projeto, reopen the same root and reselect Mayara. Confirm the neutral icon remains and Remove is hidden.
11. Select another member with a UUID/custom photo and confirm ordinary Remove/Discard still works.
12. Select a canonical no-photo member. Confirm only the neutral icon, `Sem foto.`, and hidden Remove.
13. Generate/review once in Revisar. Confirm no broken image/layout regression and `dist/assets/images/team-placeholder.svg` exists. Do not publish.

## Separate Intermittent Observation

The first-reopen discrepancy remains **not reproduced after targeted trace; no cause established; no fix claimed**. This semantic correction is not a persistence fix. Do not repeat the full earlier trace unless a check fails.

If it recurs, capture active root, selected member and actual JSON filename, displayed UUID, dirty state, full Save status/destination, immediate disk `foto`, then the root/filename/displayed path after reopening and explicitly reselecting the member. Do not infer filenames from display names. Preserve evidence before attempting another replacement. A disk/display or filename mismatch determines the next diagnostic step; do not assume cache, user error or a failed save.

The previous automated fixture trace at `3bf7fde` matched source/save/reopen `content/equipe/first.json` and UUID on disk/model/display. Its former classification expectations are superseded by this correction. Native GUI acceptance remains the maintainer's responsibility; automated tests use disposable data and a picker seam.

No full 20-point retest, Parcerias/Site media, C3, Instagram, packaging, FTP/source update, bulk migration or production publication is included.
