# Final Human Editor Proof - Equipe

Status: **passed September 17, 2026**. Albert's institution and portrait, Carolina's portrait, Maria Luiza's portrait, save/reopen behavior and generated rendering were accepted in the final release candidate. The procedure below is retained as acceptance evidence.

Use only `C:\Temp\labfonac-release-candidate-20260917`. This candidate already contains the approved page/About/Instagram changes. Albert's institution/photo and Carolina's and Maria Luiza's photos are deliberately unchanged for this exercise. Choose the correct final values yourself; do not edit JSON or publish anything.

## Open the Candidate

1. Close older Editor windows. In PowerShell, start the current Editor from the maintained checkout (the folder containing its `package.json`):

   ```powershell
   Set-Location -LiteralPath 'C:\Users\vil3l\OneDrive\1 - Work\PPGLEV\Laboratorio Fonetica\Git\lab-fon-ufrj'
   npm run editor:dev
   ```

2. Use the Electron **Editor Labfonac** window, not a website tab that may also open. Leave PowerShell running. Do not use an old packaged executable.
3. In **Projeto -> Opções avançadas -> Escolher outro projeto**, select `C:\Temp\labfonac-release-candidate-20260917`, not its `dist` folder. Confirm the project status shows that exact local path.
4. For later reopening, set **Caminho do projeto local** to the same path and click **Salvar origem do projeto**. Do not use **Conectar**, remote retrieval, source update or **Publicar**.

## Make the Four Reserved Changes

1. Open **Conteúdo**, select **Equipe**, then select Albert in **Registro**. Change **Instituição** to the authoritative affiliation. The current remote value is `LINS`; it has not been silently corrected. Click **Salvar conteúdo** and confirm a successful local save with no unsaved changes.
2. For Albert, click **Alterar foto**, select the intended JPG/JPEG, PNG or WebP image, and check the preview. Click **Salvar conteúdo**. No image needs to be copied manually into the project.
3. Select Carolina Gomes da Silva. Use **Remover foto** or **Alterar foto**, as desired. To try removal without retaining it, click **Descartar alterações** before saving and verify the original photo returns. Then make the intended final choice and click **Salvar conteúdo**.
4. Repeat that exercise for Maria Luiza de Almeida Mattos Weinstein, saving the intended final state.

Save or discard before changing records. Discard restores only unsaved changes. To restore an original photo after saving its removal, use **Carregar foto** and choose the original image through the file picker: `public\assets\images\carolina_silva.jpeg` or `public\assets\images\maria_luiza_weinstein.jpeg` inside the candidate. The Editor manages its copied reference. Do not guess an image filename by editing content files.

## Reopen and Review

1. In **Projeto**, click **Fechar projeto**, then **Abrir projeto salvo**. Confirm the same candidate path.
2. Return to **Conteúdo -> Equipe**. Check Albert's saved institution and photo, then Carolina's and Maria Luiza's saved photo states. Merely opening a record must not mark it as changed.
3. In **Revisar**, click **Gerar site**, wait for success, then **Prévia do site gerado**. Navigate to **Equipe** and expand the relevant category. Check the institution, selected portraits and neutral no-photo presentation wherever removal was saved. Confirm images are not broken or distorted.
4. Report Pass/Fail for the rows below. For any failure, include the selected record, action, visible message and screenshot. Stop on an unexpected save/reopen mismatch; do not work around it with JSON.

| Human check | Result |
| --- | --- |
| Albert institution Save and reopen | Pass |
| Albert photo Save and reopen | Pass |
| Carolina photo choice, Discard trial and saved result | Pass |
| Maria Luiza photo choice, Discard trial and saved result | Pass |
| Revisar generated rendering matches all saved choices | Pass |

No FTP, publication or packaging is part of this proof. After reporting results, close the Editor and stop its PowerShell command with Ctrl+C. Final candidate approval precedes compatible packaging and any separately authorized release operation.
