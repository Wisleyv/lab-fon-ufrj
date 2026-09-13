# Equipe Photo Picker Retest

This tests the photo-picker checkpoint following manually accepted `f8064e2`. Use the new commit from the completion report, not `f8064e2`. No FTP connection or publication is needed.

## Update Code Only

1. Save or discard current edits, close Electron, and stop the old `npm run editor:dev` process with Ctrl+C.
2. In PowerShell in the maintained Git checkout (not the disposable folder), verify the current commit and branch:

```powershell
git status --short --branch
git log -1 --oneline
```

The branch must be `chore/verified-editor-cleanup-plan-2026-09-11`, and HEAD must match the new completion-report commit. Existing uncommitted prompts/workspace files are excluded by the export.

3. The following replaces application code only in the existing `C:\Temp\labfonac-c2` copy. It preserves `content/`, `public/` (including photos), installed dependencies and other project files. Preserve any independently edited application code in the disposable folder before continuing. All listed files must be exported, including the new native helper and preload changes:

```powershell
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$archive = Join-Path $env:TEMP "labfonac-photo-code-$([guid]::NewGuid()).zip"
$code = @(
    'desktop/main.cjs'
    'desktop/preload.cjs'
    'desktop/image-assets.cjs'
    'src/js/editor/content-editor.js'
    'src/js/editor/desktop-host.js'
    'src/js/editor/focused-fields.js'
    'src/js/editor/image-field.js'
    'src/js/editor/state.js'
    'src/css/editor.css'
)
git -C $source archive --format=zip --output=$archive HEAD @code
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force
Set-Location -LiteralPath $target
npm run editor:dev
```

No dependency installation is necessary. Restart Electron rather than relying on browser hot reload: main/preload code changed. If port 3000 is occupied or no Electron window appears, stop and report the terminal output instead of testing an uncertain instance.

4. In Electron, use Projeto's advanced local-open action and choose `C:\Temp\labfonac-c2` itself. Do not select `dist/`. The disposable copy must already contain the accepted `f8064e2` code from the previous retest.

## Checklist

1. Open Conteudo, select Equipe, and select a member with an existing photo. Confirm the current preview and stored relative path appear, without a required raw-path input.
2. Choose Alterar foto (Carregar foto for a record without a photo). Select a disposable JPG/JPEG, PNG or WebP image, at most 20 MB. Confirm the new preview and dirty state.
3. Discard changes. Confirm the old path/photo returns and the member record is unchanged.
4. Select the image again and Save using the existing content-save button. Confirm successful local save, then switch members and verify their photos remain independent.
5. Close/reopen the project through advanced local open and confirm the saved photo persists.
6. In Revisar, generate and open the updated site. Confirm the existing Equipe card displays the new photo without a layout redesign.
7. Inspect the edited member's JSON under `content/equipe/`: `foto` must be `assets/images/image-<uuid>.png`, `.jpg` or `.webp`, never the original `C:\...` source path. The copied file must exist under `public/assets/images/` and, after building, under `dist/assets/images/`.
8. Open the picker and cancel it. No new dirty state or photo change should occur. Existing unsaved edits must remain intact.
9. Select Todos os arquivos in the native dialog and try a disposable unsupported file (for example `.txt` or `.svg`). Confirm a Portuguese error and no content change. A renamed non-image `.png` must also be rejected by the signature check.
10. Check a member with no photo or a missing image reference. The form must remain editable; a missing image reports Imagem indisponivel and can be replaced. Do not delete shared photos to create this test.
11. Check keyboard access/focus return, narrow-window controls and 200% zoom around the new preview, path and picker button. Other controls must be blocked while native selection is pending.

Record pass/fail/not tested, the exact commit, and screenshots for any visual defect. Actual native dialog, image decoding and visual acceptance remain manual; automated tests cover the bridge, signatures, confinement, persistence and disposable build output.

## Persistence Notes

Selecting a file copies it immediately using a new UUID filename. Only normal Save changes the member's JSON. Discard restores the reference but intentionally leaves the unused copy; replacements do not overwrite/delete old or shared assets. There is no image cleanup, cropping, resizing or compression in this slice.

Validation checks extension, file size and file signature, not a complete image decode. An otherwise corrupted image may show as unavailable in preview; choose a valid replacement. Existing photo references are not rewritten during unrelated edits. Removal is deferred because the renderer's existing no-photo fallback points to an absent placeholder asset.

Parcerias/Site pickers, C3, Instagram, packaging and production operations are not part of this retest.
