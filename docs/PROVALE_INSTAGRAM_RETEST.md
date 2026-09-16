# PROVALE Instagram Retest and Handoff

Starting checkpoint: `fe9828f`, branch `chore/verified-editor-cleanup-plan-2026-09-11`. Use the final feature checkpoint from the completion report. Only the public PROVALE profile is supported, not arbitrary profiles/posts/reels or HTML embeds. No Instagram credentials are used.

## Update the Disposable Application

The disposable project `C:\Temp\labfonac-c2` must already contain the `fe9828f` application. Save/discard edits, close Electron and stop its development terminal first. From the maintained checkout, verify HEAD matches the completion report. Preserve independent edits to the eight application files before exporting them.

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
    'src/js/main.js'
    'src/js/page/section-registry.js'
    'src/js/sections/extensao.js'
    'src/js/sections/provale-instagram.js'
    'src/js/editor/bootstrap.js'
    'src/js/editor/content-editor.js'
    'src/js/editor/content-fields.js'
)
$archive = Join-Path $env:TEMP "labfonac-instagram-$([guid]::NewGuid()).zip"
git -C $source archive --format=zip --output=$archive HEAD @files
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force -ErrorAction Stop
Set-Location -LiteralPath $target
npm run editor:dev
```

No content, assets, dependencies or workspace settings are replaced. No dependency installation is needed. Confirm a fresh Electron window, not just the browser website.

## Focused Checklist

1. Open the disposable root, not `dist`. In Conteudo -> Extensao, select PROVALE and its Instagram group. Confirm Ativar integracao and Perfil ou codigo do Instagram; no provider/credential field.
2. Activate integration. An empty source defaults to `https://www.instagram.com/provaleinterinstitucional/`. Confirm dirty state; disk `content/extensao.json` is unchanged before Save.
3. Paste the supplied official code below. Confirm it is accepted. Discard and confirm the complete prior configuration returns.
4. Try an unrelated/deceptive URL, iframe or arbitrary script. Save must be blocked, with an error; executable content must not appear in the preview or JSON. Discard the invalid input.
5. Activate again, use the profile URL or supplied snippet, then Salvar conteudo. Inspect the exact disposable `content/extensao.json`: only `enabled: true`, canonical `source`, and `provider: "instagram"` are stored in that configuration. Other project content must remain unchanged.
6. Close/reopen the same project. Confirm the saved checkbox and canonical URL. Inline editor preview remains link-only, without Instagram scripts.
7. If Extensao is disabled in this disposable composition, enable it through Pagina and save there. Do not change the maintained checkout or production composition. Generate in Revisar and open that generated preview.
8. Confirm the PROVALE profile/grid below its presentation, one official embed script, and the always-visible external link. Check that page loading completes. The generated review runs in a sandboxed, separate-origin iframe, not the privileged inline preview.
9. Disable integration and save/rebuild: no provider script/frame, but the external link remains. Restore the intended disposable setting deliberately. Record checkpoint and pass/fail; no source update or publication.

```html
<blockquote class="instagram-media"
  data-instgrm-permalink="https://www.instagram.com/provaleinterinstitucional/"
  data-instgrm-version="14"></blockquote>
<script async src="https://www.instagram.com/embed.js"></script>
```

## Verification and Release Boundary

September 16 anonymous preflight confirmed the official profile embed was available, without an account-setting change or login. The ordinary profile page showed a signup prompt; this did not prevent embedding. [Official profile embed](https://www.instagram.com/provaleinterinstitucional/embed/) and [Instagram help](https://help.instagram.com/620154495870484/).

Automated evidence: 59 focused tests; 418 full-suite tests across 30 files; web/editor production build passed once. The final review-frame sandbox attribute was separately checked by 38 bootstrap tests after the full suite. Unit tests mock provider behavior. Real offscreen Electron checks of generated assets confirmed the actual profile, one script, desktop/narrow rendering, absent Node/bridge access in the review frame, and preserved biography/link when Instagram was blocked. Provider-side non-fatal `route config was null` console messages were observed, not page-breaking errors. This is not packaged acceptance or a maintainer manual result.

No canonical content was activated and no disposable files were changed by the agent. Temporary generated-data responses were used for browser verification. Existing uncommitted handoff edits in the implementation plan are preserved separately from the feature checkpoint.

Next stage: **editorial release-baseline approval**, then integrated acceptance, compatible packaging, authorized source/production rollout, and final handoff. C3 is optional and omitted from this release. B3 and Site-logo expansion remain deferred. No general embed framework, backend, API token, OAuth, scraping, packaging, FTP or production publication was introduced/performed in this slice.
