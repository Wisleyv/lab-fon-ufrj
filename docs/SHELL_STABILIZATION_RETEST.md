# Shell Stabilization Retest

Baseline: accepted Equipe and Parcerias media, with the adapter correction at `456d5c5`. Retest only partner layout, header stability and saved local opening. No FTP, source update or publication.

## Update the Disposable Application

Save/discard current edits, close Electron, and stop its old `npm run editor:dev` terminal with Ctrl+C. Run the following in the maintained Git checkout, not in the disposable folder. Confirm branch and HEAD match the completion report before exporting. Stop if any of the six target application files have independent edits that must be preserved.

```powershell
git status --short --branch
git log -1 --oneline
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'Disposable project not found. Stop here.'
}
$files = @(
    'src/css/main.css'
    'src/js/header-scroll.js'
    'src/js/editor/bootstrap.js'
    'src/js/editor/desktop-host.js'
    'desktop/main.cjs'
    'desktop/preload.cjs'
)
$archive = Join-Path $env:TEMP "labfonac-shell-$([guid]::NewGuid()).zip"
git -C $source archive --format=zip --output=$archive HEAD @files
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

This assumes the disposable application already includes `456d5c5`, especially `src/js/adapters/JSONAdapter.js` and the accepted media controls. Only six application files are updated; `content/`, `public/`, managed images, settings and dependencies are not replaced. No `npm ci` is needed. Main/preload changed, so a full Electron restart is required, not just browser refresh. Confirm an Electron desktop window appears. If port 3000 is occupied or startup fails, stop and capture its terminal output before testing an uncertain instance.

## Checks

1. In Projeto -> Opcoes avancadas -> Escolher outro projeto, open `C:\Temp\labfonac-c2`, not `dist/`. In Revisar, generate the site and open that generated preview. CAPES must retain a nonempty saved `logo` in this disposable project's JSON.
2. Inspect CAPES: logo centered in a restrained 160x80 box, without stretching/cropping. Transparent or white space inside the source image itself is not cropped.
3. Confirm institution name, acronym, location, description and website link remain readable. In a shared grid row, website actions align at the bottom.
4. Inspect a no-logo partner: no empty image box, placeholder or broken image; text and link remain present.
5. Repeat at a narrow window and 200% zoom. No horizontal overflow or text/control overlap.
6. Return to the top. The strong expanded identity should be unchanged.
7. Scroll down slowly, then quickly. The compact switch is intentionally later than the old 24px threshold: expanded header height plus 24px (about 218px on a wide desktop).
8. Confirm one transition into compact state, with no repeated rescaling while scrolling farther down.
9. Scroll upward and move back and forth around the previous switch position. The header remains compact until within 24px of the top.
10. Repeat several down/up cycles. No self-triggered flash back to the other state after stopping the scroll.
11. In compact desktop state, the logo is approximately 96px high, comparable to the title/subtitle/navigation band; header about 128px high. Smaller widths may constrain it further.
12. Return to the top and confirm the expanded logo restores. Follow a section navigation link and confirm its heading remains clear of the sticky header.
13. Check keyboard navigation, mobile hamburger and reduced-motion settings when available. Header dimensions no longer animate between states.
14. In Projeto -> Opcoes avancadas -> Origem do projeto, choose Projeto local, enter `C:\Temp\labfonac-c2`, and click Salvar origem do projeto. This saves configuration, not content, and does not open a different project.
15. Click Fechar projeto. The saved local origin remains configured.
16. Expand Opcoes avancadas and click Abrir projeto salvo.
17. Confirm direct opening without File Explorer; status names `C:\Temp\labfonac-c2`, content appears, and the project is local. Saved media previews remain available.
18. Close and reopen once more. Restart Electron as well if convenient: the saved origin remains reusable.
19. Use Escolher outro projeto and confirm the picker still opens. Cancel must keep the existing project unchanged.
20. With no unsaved edits, temporarily save `C:\Temp\labfonac-c2-not-present` only after confirming it does not exist. Direct open must show a Portuguese error, retain any currently open project, and leave browsing available. Restore and save the real path. A saved FTP origin must not expose the local direct-open action or trigger retrieval automatically.
21. Make a disposable content or page draft change. Both local-open actions must be disabled with the existing Save/Discard status. Fechar projeto -> Cancel keeps the project and draft; explicitly save/discard before trying another open. Do not publish.

Record pass/fail/not tested, checkpoint, active project path and failed step. The maintained checkout and disposable content are separate; inspect the destination reported by Save.

## Verification Boundaries

Automated tests cover state transitions, source persistence, native/preload path forwarding, canonical validation, inaccessible paths, busy/dirty guards, close/reopen, browser fallback and existing media behavior. An isolated offscreen Electron run checked real layout/screenshots at 1440x1000, 1024x900, 390x844 and 1440x1000 at 200% zoom, plus reduced-motion CSS. CAPES content/image was read from the disposable project into an in-memory rendered fixture without writing its files; third-party requests were blocked.

That geometry check is not a manual native-dialog/editor acceptance run. The maintainer's full interaction retest above remains pending. After stabilization acceptance, Site image controls are the next separately authorized feature. C3, Instagram, packaging and production remain outside this run.
