# Equipe Photo Persistence and No-Photo Retest

Use the new completion-report commit on `chore/verified-editor-cleanup-plan-2026-09-11`, not `5948297`. The earlier picker retest found acceptance blockers; native dialog/copy success was not complete acceptance. No FTP connection or publication is needed.

## Update the Existing Disposable Copy

1. Save or discard edits, close Electron, and stop its old `npm run editor:dev` terminal with Ctrl+C.
2. Open PowerShell in the maintained Git checkout and verify:

```powershell
git status --short --branch
git log -1 --oneline
```

HEAD must match the new completion-report commit. Do not export an older checkpoint. Uncommitted prompts and workspace files are excluded by Git archive.

3. Run the following there. It updates application code and the single new shared asset in `C:\Temp\labfonac-c2`. It does NOT replace `content/`, other photos, dependencies, or project metadata. A uniquely named archive backs up the disposable application's existing code. Preserve any independently edited code before continuing.

```powershell
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$placeholder = 'public\assets\images\team-placeholder.svg'
if (Test-Path -LiteralPath "$target\$placeholder") {
    if ((Get-FileHash -LiteralPath "$target\$placeholder").Hash -ne
        (Get-FileHash -LiteralPath "$source\$placeholder").Hash) {
        throw 'A different placeholder already exists. Preserve it before continuing.'
    }
}
$backup = Join-Path $env:TEMP "labfonac-code-before-photo-fix-$([guid]::NewGuid()).zip"
Compress-Archive -LiteralPath "$target\src", "$target\desktop" -DestinationPath $backup -ErrorAction Stop
Write-Host "Previous disposable code: $backup"
$archive = Join-Path $env:TEMP "labfonac-photo-fix-$([guid]::NewGuid()).zip"
$code = @('src', 'desktop', 'public/assets/images/team-placeholder.svg')
git -C $source archive --format=zip --output=$archive HEAD @code
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

No dependency installation is needed. Run npm from the disposable folder containing `package.json`. A fresh Electron instance is required because main/preload changed. A browser at port 3000 is not proof that Electron launched. If the port is occupied or no desktop window appears, stop and report the terminal output rather than testing an uncertain instance.

4. In Electron: Projeto -> Opcoes avancadas -> Abrir projeto local. Choose `C:\Temp\labfonac-c2` itself, never `dist/`. Confirm the local project path before editing. Application code and the selected editable project can otherwise be different directories.

## Checklist

Record pass/fail/not tested for each item, the exact commit, and screenshots for any visual issue. Labels below refer to the Portuguese UI, with accents as displayed there.

1. Open Conteudo, select Equipe, and select a member with a custom photo. An `avatar.webp` reference is an old shared placeholder, not a custom photo. If necessary, select and save a disposable photo first to establish a custom-photo baseline.
2. Confirm the preview and relative path, plus visible `Salvar conteudo` and `Descartar alteracoes` above the fields. Save must be disabled while clean.
3. Click `Alterar foto`; choose a disposable JPG/JPEG, PNG or WebP, at most 20 MB.
4. Confirm a new `assets/images/image-<uuid>.<extension>` path and preview, with the same member selected.
5. Confirm global local-changes status says `nao salvas` and content reports unsaved changes. At this point JSON must still contain the old reference.
6. Confirm `Salvar conteudo` is enabled. `Salvar pagina` is a separate page-composition operation and is not needed here.
7. Click `Salvar conteudo`. Confirm the local destination path and clean status, with no FTP message.
8. Inspect the exact `content/equipe/<record>.json` named in the save status. Its `foto` must equal the UUID path, never the source `C:\...` path or a `file://` URL. Another member's JSON must remain unchanged.
9. Open Projeto and click `Fechar projeto`. Confirm no active project, empty content/preview state, and no files deleted.
10. Reopen through Projeto -> Opcoes avancadas -> Abrir projeto local, choosing the same disposable root. Return to the same member and confirm the saved path/photo.
11. In Revisar generate the site and open its preview. Confirm the new photo; the binary must exist in both `public/assets/images/` and `dist/assets/images/`.
12. Select a no-photo member (or use the removal steps below to create one). Confirm the shared neutral placeholder and no broken image. `Remover foto` is hidden for no-photo and legacy shared-placeholder records.
13. Select a custom-photo member and click the destructive `Remover foto` action. Note the original file path first.
14. Confirm immediate shared placeholder, empty reference, dirty content/global status, and enabled Save. Try `Fechar projeto` and CANCEL the confirmation: the project and draft must stay open, allowing normal Save or Discard. Do not accept discard yet.
15. Return to Conteudo and click `Descartar alteracoes`. Confirm the original custom reference/photo returns and JSON is unchanged.
16. Remove again and click `Salvar conteudo`. Confirm the record now contains `"foto": ""`, with a truthful saved path and clean status.
17. Close using `Fechar projeto`, reopen, generate, and review again. Confirm the placeholder in editor and generated site. `dist/assets/images/team-placeholder.svg` must exist. Closing Electron is an optional additional persistence check, not a substitute for project close.
18. Confirm the old custom image file still exists. Test confirmed dirty-close separately with a disposable draft: accepting discard closes without saving and leaves JSON/assets unchanged. Repeat cancellation with an unsaved page-composition draft.
19. Cancel the native picker: no photo/dirty-state change. Try Todos os arquivos with an unsupported `.txt`/`.svg` and a non-image renamed `.png`: an error must leave content unchanged. A missing legacy photo must remain editable with a fallback, without rewriting its reference.
20. Check keyboard access and focus after selection/removal, narrow desktop windows, and 200% zoom. Save/Discard, long paths, and photo actions must remain reachable without overlapping. Other operations, including close, must be blocked while the picker is pending.

## Persistence and Diagnosis

The complete editor fixture at `5948297` already marked selection dirty and persisted the exact path through the real content store on Save. The reported clean-state symptom was not reproduced; do not claim its cause was established or GUI acceptance achieved. Save controls were below the fields; they now lead the focused form. If the symptom recurs, capture the Electron terminal, visible project path, selected member, global/content status before and after selection, and the exact JSON file inspected.

The picker copies a binary immediately but never writes JSON. Normal content Save uses verified `desktop/content-store.cjs` persistence. Discard restores the reference and intentionally leaves newly copied unused binaries. Removing a photo only clears the reference; there is no asset deletion or garbage collection.

No-photo semantics: absent/empty `foto` resolves to `assets/images/team-placeholder.svg` under the current build base. New records and explicit removal use an empty string. The project-owned SVG is shared by all such members, never copied into UUID files. Existing `assets/images/avatar.webp` is an old abstract shared placeholder; it and valid custom references remain unchanged on load/unrelated edits. Missing images fall back visually without normalizing JSON. No member files were bulk rewritten.

Automation covers full-editor draft/global status, actual save-button submission, canonical read-back, close/cancel/reopen, bridge revocation, placeholder rendering and disposable build output. Native dialog interaction, image decoding, visual layout and zoom acceptance remain manual.

Parcerias/Site media, C3, Instagram, packaging, FTP/source update and public publication remain outside this retest.
