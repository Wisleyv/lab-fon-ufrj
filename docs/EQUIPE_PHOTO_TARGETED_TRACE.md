# Equipe Targeted Retest and Recurrence Capture

Application checkpoint remains `42f845c`; the September 14 diagnostic run changes tests/documentation only. No application files need exporting to `C:\Temp\labfonac-c2`. Preserve its current content and assets, and the annotated 20-point checklist. Do not repeat that entire checklist.

## Mayara: Stored State Explains Remove Visibility

On September 14, both the maintained checkout and `C:\Temp\labfonac-c2` contain `content/equipe/mayara-gak-assump-uo.json` with `foto: "assets/images/avatar.webp"`. The referenced asset exists in both projects. This is an intentionally recognized legacy shared placeholder, so `Remover foto` is correctly hidden. A visible image alone does not establish a custom-photo reference. No JSON or classification code was changed.

1. Open `C:\Temp\labfonac-c2` through Projeto -> Opcoes avancadas -> Abrir projeto local, then Conteudo -> Equipe -> Mayara.
2. Check the displayed reference against that exact JSON file. If it remains `assets/images/avatar.webp`, expect no Remove action. Do not force removal or edit JSON to make the button appear.
3. Only to test custom-photo behavior, choose a disposable supported image using Alterar foto. Expect a managed UUID reference, dirty state and visible Remove. Discard should restore the legacy reference and hide Remove again. Saving a replacement makes it a custom photo; ordinary Remove/Discard/Save then applies. Use the disposable project only.

## One Traceable Replacement/Save/Reopen

1. Choose one member and record name, selected JSON filename, active project root, initial photo path and current content status. Do not assume a filename from the person's display name.
2. Select a supported replacement image. Record the displayed `assets/images/image-<uuid>.<ext>` and confirm the unsaved status and enabled Salvar conteudo.
3. Click Salvar conteudo. Record the full success message and exact destination path. Immediately read that exact file with PowerShell, substituting the destination shown:

```powershell
$file = Read-Host 'Exact JSON destination from the save status'
Get-Item -LiteralPath $file | Select-Object FullName, LastWriteTime, Length
Get-Content -LiteralPath $file -Raw | ConvertFrom-Json | Select-Object nome, foto
```

4. Compare its `foto` with the displayed UUID path and confirm the binary under the opened project's `public/assets/images/`. Capture any error rather than treating a clicked button as successful Save.
5. Use Fechar projeto, confirm no active project, and reopen the same exact root. Reselect the same member and record the selected filename again. The editor deliberately resets record selection on reopening; identify the member explicitly, not just the first displayed image. This is workflow context, not an explanation of the earlier discrepancy.
6. Compare source filename, save-status destination, reopened selected filename, disk `foto`, and displayed path. Report all five values if they disagree. Do not repair/delete/rename files before capturing evidence.
7. Smoke only: check one placeholder member, one custom member's ordinary removal/save, and one Revisar build/review. No FTP or publication.

## Optional Read-Only Editor Console Snapshot

If the Electron developer-tools console is available, run this before replacement, after selection, after successful Save, and after reopening/reselecting the member. It reads only existing UI state; it does not write files or invoke the desktop bridge. Keep the four outputs with the disk inspection and screenshots. Paths may identify your local account, so share them only in the project support context.

```javascript
(() => {
  const get = (id) => document.getElementById(id);
  const record = get("editor-content-record");
  console.log(JSON.stringify({
    capturedAt: new Date().toISOString(),
    project: get("editor-project-status")?.textContent,
    dataset: get("editor-content-dataset")?.value,
    file: record?.value,
    member: record?.selectedOptions[0]?.textContent,
    photo: document.querySelector(".editor-image-path")?.textContent,
    changes: get("editor-session-changes")?.textContent,
    contentStatus: get("editor-content-edit-status")?.textContent,
    saveDisabled: get("editor-content-save")?.disabled
  }, null, 2));
})();
```

If developer tools are unavailable, capture the same visible values in screenshots and retain the exact disk path; do not change application security settings.

## Current Result and Acceptance Gate

The September 14 full-editor disposable trace began at `assets/images/avatar.webp`. It saved and reopened the same `content/equipe/first.json`, with disk/model/display all resolving `assets/images/image-00000000-0000-4000-8000-000000000001.png`. The fixture uses a simulated picker response and actual canonical JSON persistence; it is not a native-dialog/image-decoding GUI retest.

The intermittent first-reopen observation is **not reproduced after targeted trace**, not fixed or disproven. Mayara's current state is explained by the existing intended rule. Retain the prior 18/20 provisional acceptance; full Equipe manual acceptance still requires the maintainer's targeted confirmation. No replacement of shared assets, generalized media work or production operation is authorized here.
