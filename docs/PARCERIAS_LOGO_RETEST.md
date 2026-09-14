# Parcerias Logo Retest

Equipe media at `311109c` is manually accepted. This is only the new Parcerias logo slice; do not repeat the Equipe checklist or publish anything.

## Update the Disposable Application

Save/discard current edits, close Electron and stop the old `npm run editor:dev` terminal with Ctrl+C. In the maintained Git checkout, verify HEAD matches the new completion-report commit on `chore/verified-editor-cleanup-plan-2026-09-11`:

```powershell
git status --short --branch
git log -1 --oneline
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$files = @(
    'src/js/editor/image-field.js'
    'src/js/editor/content-editor.js'
    'src/js/editor/content-fields.js'
    'src/js/sections/parcerias.js'
    'src/css/main.css'
)
$archive = Join-Path $env:TEMP "labfonac-partner-logos-$([guid]::NewGuid()).zip"
git -C $source archive --format=zip --output=$archive HEAD @files
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

Only these five application files are replaced. Preserve independent edits to them first. No content, images, dependencies, workspace settings or metadata are replaced; no new shared asset is needed. The disposable copy must already contain the accepted `311109c` application, including its team-photo helper. Confirm a fresh Electron window, not just a browser page. If startup fails or uses an occupied port, capture terminal output rather than testing an uncertain instance.

## Fifteen Checks

1. In Projeto -> Opcoes avancadas -> Abrir projeto local, open `C:\Temp\labfonac-c2` itself, not `dist/`. Go to Conteudo -> Parcerias.
2. Choose a partner without a logo. Confirm its name/fields remain intact, no image placeholder appears, and Remove is hidden.
3. Click Carregar logo and select a disposable institutional JPG/JPEG, PNG or WebP, up to 20 MB. SVG support has not been added.
4. Confirm current preview, managed `assets/images/image-<uuid>.<ext>` path, same selected partner, dirty global status and enabled Salvar conteudo. Cancel the picker once and try an unsupported file via Todos os arquivos; neither should change the current draft/reference.
5. Discard. Confirm no logo returns, no dirty state remains, and the record has not acquired a logo field merely from opening the form.
6. Load again and click Salvar conteudo. Confirm clean state and the exact local JSON destination. No FTP transfer should be implied.
7. Inspect that exact `content/parcerias/<record>.json`: `logo` must equal the managed relative path, never a source drive path or `file://` URL. Other fields/partners must remain unchanged. The copied file exists under `public/assets/images/`.
8. Use Fechar projeto and reopen the same root. Reselect the partner and confirm the saved logo/reference.
9. Click Alterar logo and choose a different image. Confirm the draft preview changes. Discard once to restore the saved reference; replace again and Save if desired.
10. Click Remover logo. Confirm the preview disappears immediately, no generic placeholder appears, and content becomes dirty. Disk JSON remains unchanged until Save.
11. Discard once to restore the prior logo. Remove again and Save: JSON now contains `"logo": ""`. Confirm the old binary is still on disk. Keep another disposable partner with a saved logo for the next checks.
12. Generate and open the site using Revisar.
13. Confirm both logo/no-logo partners render correctly: institution names, descriptions and links remain visible; no-logo cards remain text-only; logos fit without cropping/stretching. Confirm the managed file is copied to `dist/assets/images/`. The image is decorative beside the visible institution name; no filename is used as alternative text.
14. Check keyboard focus after selection/removal, narrow desktop window and 200% zoom for the logo controls and generated cards. During selection, other conflicting operations must remain blocked. A failed image should not leave a broken-image icon.
15. Record pass/fail/not tested and the exact checkpoint. Confirm no FTP/source update or publication was used.

## Boundaries

Optional `logo` is a string. Absence remains absent on unrelated saves; explicit removal stores an empty string. No-logo renders no image. Save/Discard uses the same canonical content owner as Equipe; the shared picker/copy service and file safety rules are unchanged. Copies discarded later, replaced binaries and removed binaries intentionally remain; no garbage collection is implemented.

Native GUI/real image decoding and visual acceptance require this manual retest. Automation uses temporary fixtures. The historical Equipe reopen discrepancy remains not reproduced after targeted trace, with no cause established or fix claimed; reopen it only if new evidence appears.

After Parcerias manual acceptance, the next separately authorized media slice is Site image controls. Site media, C3, Instagram, packaging, FTP and production publication are not part of this run.
