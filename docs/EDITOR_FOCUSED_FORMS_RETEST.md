# Focused Content Editor Retest

September 13, 2026. Applies to the focused-form checkpoint following `2e0378b` on `chore/verified-editor-cleanup-plan-2026-09-11`.

Automated verification at `f8064e2`: 136 focused tests / 7 files; 300 full-suite tests / 27 files; web/editor build passed. The maintainer subsequently accepted this entire manual checklist. See the [acceptance record](C2-manual-acceptance-report-2026-09-13.md). The next checklist is the [Equipe photo-picker retest](EQUIPE_PHOTO_PICKER_RETEST.md); the commands below are historical instructions for the focused-form checkpoint.

## Update the Existing Disposable Copy

1. Close the disposable Electron window. Stop its previous `npm run editor:dev` terminal with Ctrl+C. Resolve any pending edits first. Do not connect to production during this retest.
2. Open PowerShell in the maintained Git checkout, not `C:\Temp\labfonac-c2`. Verify the branch and that HEAD matches the commit supplied in the completion report:

```powershell
git status --short --branch
git log -1 --oneline
```

3. The following exports code only from that commit. It does not copy `content/`, `public/`, credentials, dependencies or generated output. If you have separately edited code in the disposable folder, preserve those edits before continuing. Otherwise run:

```powershell
$source = (git rev-parse --show-toplevel).Trim()
$target = 'C:\Temp\labfonac-c2'
if (-not (Test-Path -LiteralPath "$target\package.json")) {
    throw 'The disposable project was not found. Stop here.'
}
$archive = Join-Path $env:TEMP "labfonac-focused-code-$([guid]::NewGuid()).zip"
$code = @(
    'desktop/main.cjs'
    'src/js/editor/bootstrap.js'
    'src/js/editor/content-editor.js'
    'src/js/editor/focused-fields.js'
    'src/js/editor/custom-section-editor.js'
    'src/js/editor/project-loader.js'
    'src/js/editor/publish-service.js'
    'src/js/sections/custom.js'
    'src/css/editor.css'
    'src/css/main.css'
)
git -C $source archive --format=zip --output=$archive HEAD @code
if ($LASTEXITCODE -ne 0) { throw 'Code export failed. Stop here.' }
Expand-Archive -LiteralPath $archive -DestinationPath $target -Force
Set-Location -LiteralPath $target
npm run editor:dev
```

Dependencies have not changed; reuse the existing installed dependencies. This command must run beside the disposable `package.json`. Keep the PowerShell process running. The expected result is an Electron editor window, not just the public site in a browser. The editor URL is `/labfonac/editor.html`. If port 3000 is occupied or no Electron window appears, stop and report the terminal output rather than continuing against an uncertain instance.

4. In Electron, use Projeto's advanced local-open action and select `C:\Temp\labfonac-c2` itself, not `dist/` or `content/`. This makes both the running code and the edited project disposable. No FTP connection is needed.

## Acceptance Checklist

1. Conteudo has one content selector with Site, Equipe, Linhas de Pesquisa, Parcerias, Extensao and each custom instance. Duplicate titles have different numbered labels. Only the selected editor is visible.
2. Select custom A and B; check their independent text. In Pagina, select an instance and use Editar conteudo: Conteudo opens with the same instance selected and focused.
3. Create a new custom section and check automatic selection. Save or discard its page changes before creating another section or switching to another item. An attempted switch with pending edits must retain the current selection and draft.
4. In Equipe, Parcerias and Linhas de Pesquisa, select two records in turn. Only one record's fields appear. Edit, attempt a switch, discard, then edit/save and switch. Add a disposable record and discard it; existing records must remain unchanged.
5. In Site, choose Apresentacao, then Links using the group selectors. Only one link is expanded. Edit/save, add/save, reorder/save and remove/save. Reopen the project and confirm the saved list order/content. Check Rodape groups and Extensao projects similarly, saving or discarding before switching groups/items.
6. Edit custom heading, paragraph, list, link and button blocks. Rename/reorder/disable/re-enable; the inline preview must follow changes. Save/reopen must retain both independent IDs and content. Discard must restore the whole page without silently saving it.
7. Salvar pagina must name `C:\Temp\labfonac-c2` as the local project and report no FTP transfer. Source update/publication remain unavailable for this local project. Do not test production retrieval merely to inspect the separate remote-copy wording; that branch has automated coverage.
8. In Revisar, generate and open the updated site. Inspect custom sections beside Sobre/Parcerias: matching prose width, wrapped long text/lists/CTA labels, no new horizontal overflow. Do not judge the old generated site before rebuilding it.
9. In Electron, test Ctrl with numeric-keypad + and -, top-row zoom in/out, and Ctrl+0. Check that one press gives one zoom step. Without Ctrl, keypad + and - must still enter text normally in a field.
10. Check primary Save, secondary Add/Discard/Edit and destructive Remove styling, hover, disabled states and visible keyboard focus. Group selection must retain keyboard focus after rerendering.
11. Repeat key form/layout checks at a narrow desktop window and 200% zoom. Check both the editor and generated site; record any overlap, clipped control or horizontal overflow with a screenshot.
12. Report each item as pass/fail/not tested, including the tested commit and exact failing action. Do not package, update remote source or publish as part of this checklist.

After acceptance, the proposed next implementation slice is an Equipe photo picker, separately authorized. B3 contextual help remains deferred; media, C3 and Instagram are not included here.
