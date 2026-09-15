# Site Header Logo Replacement Retest

Baseline: manually accepted shell stabilization at `13eea53`. Test only the replacement-only Site header logo workflow. Do not repeat Equipe/Parcerias acceptance or use FTP/publication.

## Update the Disposable Application

Save/discard edits, close Electron and stop its old `npm run editor:dev` terminal with Ctrl+C. Run this in the maintained Git checkout, not in the disposable folder. Confirm HEAD matches the new completion-report commit on `chore/verified-editor-cleanup-plan-2026-09-11`. Preserve independent edits to these five application files before overwriting them.

```powershell
git status --short --branch
git log -1 --oneline
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$files = @(
    'src/js/editor/content-editor.js'
    'src/js/editor/content-fields.js'
    'src/js/editor/image-field.js'
    'src/js/site-content.js'
    'src/css/main.css'
)
$archive = Join-Path $env:TEMP "labfonac-site-logo-$([guid]::NewGuid()).zip"
git -C $source archive --format=zip --output=$archive HEAD @files
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

The disposable application must already include `13eea53`. Only five application files are updated; no content, images, dependencies, native bridge files or workspace settings are replaced. No `npm ci` is needed. Confirm a fresh Electron desktop window. Stop and capture output if startup fails or port 3000 is occupied.

## Sixteen Checks

1. Open `C:\Temp\labfonac-c2` using the accepted saved-project action or picker, not `dist/`. Go to Conteudo -> Site; select Cabecalho, then Logotipo in the nested group selector.
2. With the original legacy configuration, confirm the PNG fallback previews correctly. Opening the group must not mark content dirty or rewrite the SVG/source/srcset configuration. Save an unrelated header title change and confirm the logo object remains unchanged, then restore that title through the editor.
3. Confirm Texto alternativo (acessibilidade) is a normal text input with the existing value. Raw source/fallback/srcset inputs and Remover logo must not appear.
4. Click Alterar logo. Cancel once: no content change. Try SVG via Todos os arquivos: rejection must leave the entire draft unchanged. Supported formats remain JPG/JPEG, PNG and WebP, up to 20 MB.
5. Select a disposable raster image, preferably a visibly different square or portrait image to test containment.
6. Confirm a new preview, managed `assets/images/image-<uuid>.<ext>` path, dirty status and enabled Salvar conteudo. Removal must still be absent.
7. Before Save, inspect the exact disposable `content/site.json`; it must still contain the previous logo configuration. Only the copied binary may already exist on disk. Alt text must not be derived from the filename.
8. Discard. Confirm the old fallback preview/path returns, state becomes clean, and source/fallback/srcset/alt all match the prior configuration. The discarded binary may remain.
9. Replace again and Save. Confirm clean state and the reported local destination `C:\Temp\labfonac-c2\content\site.json`, not the maintained checkout's separate file.
10. Inspect that file: `header.logo.source` and `header.logo.srcset` are empty strings; `fallback` is the managed relative path; `alt` is unchanged unless explicitly edited. Other Site content remains unchanged. The copied file exists below `public/assets/images/`.
11. Close/reopen the same project, return to the Logotipo group, and confirm the raster preview/path persists. Edit alt text once, confirm it remains editable independently, and save or discard deliberately.
12. Generate and open the site through Revisar in the disposable project. A previous build or the checkout's development site is not evidence for disposable content changes.
13. Confirm the new image is used, not the old SVG or retina PNG. With developer tools, the header picture should have no source element or img srcset, and img currentSrc should resolve to the managed raster. Confirm the image also exists under `dist/assets/images/`.
14. Inspect expanded/compact header states while scrolling down and up. The new image must remain contained without stretching/cropping; header dimensions, navigation and stable transitions should be unchanged.
15. Check a narrow window and 200% zoom. No horizontal overflow or overlapping header content. A square image will occupy less horizontal space inside the fixed wide logo box; this is intentional containment.
16. Record checkpoint, active project path and pass/fail/not tested. No FTP/source update or publication. This control intentionally cannot remove the header identity image, convert SVG, or generate retina variants.

## Evidence and Boundaries

Canonical replacement is `{ source: "", fallback: "assets/images/image-<uuid>.<ext>", srcset: "", alt: "existing text" }`. Legacy SVG/PNG/srcset remains unchanged until explicit replacement. Discard restores the complete prior object. Old/shared/discarded assets are never deleted.

Automated tests use temporary fixtures and cover canonical read-back, full draft restoration, fallback preview, alt semantics, invalid/cancelled picks, absent Remove, build asset copy and adapter-to-renderer behavior. Offscreen Electron confirmed actual currentSrc switching and restoration, image decoding, unchanged header dimensions and no horizontal overflow at 1440x1000, 1024x900, 390x844 and 200% zoom. A square existing WebP was used only in memory; no real Site content was changed. This is not a manual native picker/editor acceptance run.

Next: maintainer Site-logo acceptance. Then choose one separately authorized C3 block/layout increment or the independent Instagram phase, as prioritized by the maintainer. Neither is started by this run.
