# Editorial Release Baseline - September 16, 2026

Status: **production release completed September 21, 2026**. The approved candidate was updated to `/source/`, retrieved into a fresh isolated workspace, proven identical, built and reviewed through the Editor, published to `/`, and verified live. Git reconciliation records the deployed editorial source and release evidence; package distribution and backup/recovery design remain separate follow-up work.

## Production Release - September 21

The normal remote-update workflow completed on September 17 at approximately 23:28 UTC with `REMOTE_PROJECT_SOURCE_UPDATED` and all eight required source markers verified. A fresh Editor retrieval on September 21 created `C:\Temp\labfon-normal-release-ZM0dUU\final-profile\workspaces\lab-fon\current`. Comparison against the approved `C:\Temp\labfonac-release-candidate-20260917` proved all **198 source-bundle files SHA256-identical** and all **79 content JSON files semantically identical**.

`Revisar -> Gerar site` then completed from that retrieval. Release-critical review confirmed the intended visible composition (`sobre`, `linhas-pesquisa`, `pesquisadores`, `extensao`, `parcerias`), hidden Publicacoes/test content, the approved About and Equipe decisions, the PROVALE Instagram profile, footer ordering/copyright, all 55 referenced images returning non-empty HTTP 200 responses, and zero horizontal-overflow, runtime or network errors.

At **2026-09-21 10:30:03 UTC**, the normal Editor publication workflow returned `PUBLISH_SUCCEEDED`: **77 of 77 generated files** were transferred to `/`. The durable operation manifest is `C:\Temp\labfon-normal-release-ZM0dUU\final-profile\publish\manifests\publish-2026-09-21T10-28-03-416Z.json`; the broader temporary evidence root is `C:\Temp\labfon-normal-release-ZM0dUU`.

Post-publication Editor listings confirmed the expected generated-site files at `/` and editable source markers beneath `/source/`. The live site at `https://posvernaculas.letras.ufrj.br/labfonac/` returned HTTP 200 and passed the same release-critical checks. No application code changed during the release operation, so the preceding `df8d1e4` verification remains applicable: 122 focused tests, 450 full-suite tests and the production web/Editor build passed. After Git reconciliation, the canonical-content assertions were updated to the approved release composition; the complete suite again passed **450 tests / 31 files**, and `npm run build` passed.

This Git milestone reconciles the checkout to the published editorial authority: the twelve approved content records, three referenced final portraits and regenerated `public/data.json`. Unreferenced candidate image copies, local prompt/workspace files and personal artifacts are not release inputs and remain excluded. The sections below preserve the earlier gates and decisions as historical evidence.

## Guarded Initialization Correction - September 17

Authority: [initialization-guard prompt](Follow-up-prompt-Astra-fix-remote-initialization-guard.md). Branch: `chore/verified-editor-cleanup-plan-2026-09-11`; start **`349bf12`**, final code **`df8d1e4`**, committed and pushed to the same branch. Only the three implementation files and two related test files were committed; existing user changes and release documentation remain separate. No merge/tag or packaging.

### Narrow Correction

The previous `getSourceUpdateReadiness` rule blocked every locally opened project, and the normal Editor UI never called the existing guarded initializer. The ordinary update/publication guards remain unchanged. A separate **Inicializar projeto remoto** action now reuses `createPublishController.initializeRemoteProjectSource` and the existing native `initializeRemoteProjectSource`/filtered bundle uploader; no second FTP implementation was added.

Initialization requires a valid local project, clean content/page drafts, no busy operation, a valid explicit-FTPS profile targeting exactly `/source`, a successful connection for that endpoint, and a successful `/source` listing bound to the same profile. Only supported `.htaccess`/`.ftpquota` files are exempt from emptiness; directories with those names are rejected. Listing failures, connection/profile changes, other paths, populated source, invalid projects and unsaved changes disable the action with an associated status reason.

Confirmation contains the local path, host/port, `/source/` destination, creation of editable remote source and explicit non-publication statement. Cancellation makes no write. The controller rechecks readiness/project identity and prevents concurrent duplicate initialization. Native handling revalidates local source, authenticates, lists the target again and refuses unexpected contents before using the existing filtered uploader. Strict TLS defaults, credentials, ordinary retrieval/update, local editing and publication/build guards were not relaxed.

After any attempted initialization, the empty-listing evidence is consumed; failures cannot reuse it. No automatic retry/rollback is claimed. Native transfer or verification failure reports possible partial remote state. Success reports initialization and pending retrieval, without changing local project provenance or granting publication. Fresh explicit retrieval must pass the normal loader before the existing remote-project flow resumes; publication still requires its existing review/build/destination gates.

### Verification

- Focused readiness/UI, native source, publication and state regressions: **122 passed / 6 files**.
- Full suite run once after focused corrections: **450 passed / 31 files** (421 baseline plus 29 new cases).
- Production `npm run build` run once: **passed**, both web and Editor entries. Existing dirty checkout `public/data.json` restored byte-for-byte after generated-data preparation. No installer/package build.
- Tests cover disconnected/dirty/busy/invalid/non-empty/stale-profile states, exact target, cancellation, confirmation, duplicate clicks, malformed/failed results, retained local provenance, explicit retrieval, filtered bundle destinations, TLS defaults, missing target, invalid local source, protection-metadata directories and partial failure without retry.
- Initial test failures were fixture assumptions about asynchronous saved-profile loading and `directory.provenance.source`; fixtures were corrected to match existing contracts. The final focused and full runs passed without weakening assertions or application safeguards.

### Authorized Real-Server Check

Actual Editor controls and unchanged production IPC registration ran with an isolated encrypted-settings profile, using the corrected implementation. The observation harness records sanitized operation results and accepts only the exact authorized native confirmation; it neither substitutes handler results nor calls FTP/upload handlers directly. An inherited `ELECTRON_RUN_AS_NODE=1` initially prevented the isolated launcher from starting; removing that variable for the launch resolved this local harness issue before any connection/write, without application changes.

The sole upload authority remains **`C:\Temp\labfonac-release-candidate-20260917`**. All **198 allowed source-bundle files** matched the previous approved SHA256 manifest before the attempt. No candidate content or application files were overlaid from checkout: the candidate's accepted source remains based on `349bf12`, while the controlling Editor runs `df8d1e4`. Future parity must compare the retrieval to this approved candidate, not assume it equals the newer checkout. The 79 content JSON files and final human-approved Equipe choices were preserved.

Endpoint: **`host.icarai-mindnet.com.br:2100`**, explicit FTPS with strict certificate validation. Fresh Editor listings on September 17:

| Check | UTC time | Result |
| --- | --- | --- |
| Root `/` | 18:36:16.380 | Only `source/` and `.ftpquota` (7-byte hosting metadata) |
| Source `/source/` | 18:36:26.044 | Empty |
| Explicit confirmation | 18:36:26.960 | Approved candidate, exact endpoint and `/source/`; public site not published |

The initialization button was enabled only after those checks; ordinary update/publication remained disabled. Screenshot and confirmation text were captured. At **18:42:02.022 UTC**, the actual native initializer returned `REMOTE_PROJECT_SOURCE_INITIALIZED` with all eight required remote markers verified. The UI reported initialization success and pending retrieval, retained clean local provenance, and kept publication disabled.

**Exact remote-write scope:** one guarded initialization invocation, uploading the existing filtered **198-file / 31,678,445-byte** approved bundle and ensuring its directories beneath `/source/`. No deletion, ordinary source-update operation, generated `dist/` upload or publication to `/` occurred. Root `.ftpquota` was outside the write destination.

Fresh retrieval began explicitly at approximately 18:42:08 UTC and succeeded at **18:44:41.011 UTC**, returning `REMOTE_PROJECT_RETRIEVED`. Its isolated workspace is:

`C:\Temp\labfon-initialization-EZnCpe\editor-profile\workspaces\lab-fon\current`

The normal Editor loader opened it as **valid**, with `remote-ftp` provenance and no unsaved changes. The initialization action is hidden for that retrieved project, ordinary source update is available, and publication remains disabled because no current generated build exists. Screenshots confirm the expected action states without overlapping controls. The isolated Editor and its Vite process were closed after capture; the retrieved workspace remains available. No other preview processes were targeted.

| Real-server acceptance gate | Result |
| --- | --- |
| Open unchanged approved candidate | PASS; local, valid, clean |
| Strict FTPS authentication and fresh empty-target verification | PASS |
| Initialization action availability and explicit confirmation | PASS |
| Existing native initializer and remote marker verification | PASS; one invocation |
| Publication blocked on original local project after initialization | PASS |
| Explicit fresh retrieval into isolated workspace | PASS |
| Normal loader validates/opens retrieved source cleanly | PASS |
| Retrieved-project ordinary update readiness | PASS; no update invoked |
| Candidate vs retrieved-source full parity | NOT RUN; next gate |
| Revisar/build from retrieval, publication, live HTTP verification | NOT RUN; outside this run |

No remaining blocker was observed for this slice. The successful native marker check and loader open are **not** a full source/content/assets parity claim and do not establish publication readiness.

Evidence directory: `C:\Temp\labfon-initialization-EZnCpe` (`candidate-manifest.json`, `pre-write-listings.json`, `confirmation.json`, sanitized `editor-operations.jsonl`, `initialization-result.json`, `retrieval-result.json`, `final-ui.json` and UI screenshots). Its `editor-profile` contains encrypted credentials and must not be committed or shared. The fresh retrieval workspace is a separate project under that isolated profile, not the profile itself.

**Stop boundary:** initialization -> explicit fresh retrieval -> clean validated open. No Revisar/build of the retrieved source, publication to `/`, live HTTP verification, package or backup tooling is authorized here. Next release gates remain candidate vs fresh retrieval parity -> Revisar from fresh retrieval -> separately authorized publication -> live verification. Before any future remote write, preserve both `/source/` and `/`; this run does not add backup tooling.

## Clean-Server Release Attempt - September 17 (Historical)

This section supersedes the older pending human-proof, editorial-authority, deployment-authorization and release-sequencing notes below. Authority: [clean-server initialization prompt](Follow-up-prompt-Astra-clean-server-initialization-release.md). Branch: `chore/verified-editor-cleanup-plan-2026-09-11`; HEAD: **`349bf12`**, unchanged. Attempt recorded September 17, 2026, 17:58-18:04 UTC (14:58-15:04 America/Sao_Paulo). There is **no deployment timestamp**, because no deployment occurred.

### Approved Candidate and Local Checks

The sole release authority is **`C:\Temp\labfonac-release-candidate-20260917`**, not checkout content or the obsolete September 16 remote test snapshot. Human proof and final institution/photo choices are accepted from the maintainer's instructions, not claimed as a new automated human test.

- Schema v2 validated; Publicacoes disabled; active order Sobre -> Linhas -> Equipe -> Extensao -> Parcerias; no custom Teste instance, Missao item or stale Publicacoes hero action; accepted Instagram configuration retained.
- 79 content JSON files, 198 allowed source-bundle files and 19 referenced assets; no missing referenced assets. Application/config/script comparison against accepted code found no differences after harmless line-ending normalization.
- Candidate SHA256 manifest recorded at `2026-09-17T17:58:44.483Z` and rechecked unchanged before the intended operation. These counts describe the local candidate, **not uploaded files**.
- Albert's institution is LISN; his photo and Carolina's/Maria Luiza's photos use the final managed paths in the candidate. No editorial values were changed by this run.
- Actual Editor opened that exact local candidate as valid, with no unsaved content/composition changes. User checkout edits and settings were preserved.

### Real Connection and Pre-Write State

The unchanged production Electron main/preload and Editor UI ran with an isolated local profile. UI controls used actual native handlers; no FTP/mock results, substituted project provenance or direct upload calls were used. Existing encrypted credentials were used without logging plaintext. Endpoint: **`host.icarai-mindnet.com.br:2100`**, explicit FTPS, strict default certificate validation; no insecure TLS options or hosting changes.

Authentication succeeded at `2026-09-17T17:59:20.974Z`. Actual Editor directory listings:

| Remote path | Observed at (UTC) | Entries |
| --- | --- | --- |
| `/` | 17:59:23.747 | `source/` directory and `.ftpquota` (7-byte hosting quota metadata) |
| `/source/` | 17:59:48.269 | Empty |

The cleaned-state precondition passed. Hosting metadata was left untouched. No remote directory was created or deleted.

### Observed Blocker and Stop

In Publicar, **Atualizar projeto remoto** was disabled with: "Projeto local: atualização remota e publicação indisponíveis nesta sessão." The source destination was `/source`, publication destination `/`, connection was active and local drafts were clean. Evidence was captured again at `2026-09-17T18:03:48.118Z`.

`src/js/editor/publish-service.js:461` (`getSourceUpdateReadiness`) rejects `openedProject.source === "local"` through `REMOTE_PROJECT_REQUIRED`, stage `not_started`. This is the observed UI blocker, **not a failed FTP upload**. No source-update handler was invoked.

Narrow read-only code inspection also found that `desktop/main.cjs:983` (`updateRemoteProjectSource`) validates existing remote project markers before upload, so normal update is not the empty-server initializer. The separate guarded `initializeRemoteProjectSource` already exists in the native/controller layers (`desktop/main.cjs:897`, `src/js/editor/publish-service.js:292`), but `bootstrap.js` does not connect that method to the normal source-update control. This secondary gap was not tested by invoking native initialization: doing so outside the UI would bypass the required workflow.

The prompt's safeguard stop condition was honored. **Exact remote writes: none.** No upload, deletion, directory creation, initialization, source update or publication occurred. No ad hoc FTP fallback was used.

### Editor Real-Server Workflow Matrix

| Operation | Result |
| --- | --- |
| Connect/authenticate with strict explicit FTPS | PASS |
| Verify cleaned root and source directory | PASS; listings above |
| Open approved local candidate | PASS; valid candidate, clean drafts |
| Update/initialize `/source/` | BLOCKED BEFORE INVOCATION; local-project readiness guard |
| Fresh retrieve `/source/` | NOT RUN; no initialized source; no retrieval workspace |
| Open/validate retrieved project | NOT RUN |
| Candidate vs retrieved-source parity | NOT RUN |
| Build via Revisar from fresh retrieval | NOT RUN |
| Preview generated site from fresh retrieval | NOT RUN |
| Publish generated site to `/` | NOT RUN |
| Live HTTP verification | NOT RUN; no publication to verify |
| Verify `/source/` survives publication | NOT RUN; publication never started |
| No accidental dirty-state/data loss | PASS for executed local workflow; no content saves/writes |

Last observed `/source/` state is empty. With no remote writes, nothing was altered by this run; no post-publication integrity claim or fresh final listing is implied. The isolated Editor and its Vite process were closed after evidence capture. Existing candidate preview processes were not targeted.

### Evidence, Verification and Handoff

Local evidence: `C:\Temp\labfon-clean-release-kqpq64\candidate-manifest.json`, `pre-write-listings.json`, sanitized `editor-operations.jsonl`, `source-update-ui.json` and `source-update-result.png`. The same directory's `editor-profile` contains encrypted local settings and must not be committed or shared as a report. It is **not** a freshly retrieved project workspace.

No application/test files changed, so the full suite and builds were not rerun. The earlier 421-test/30-file and production web/Editor-entry build results remain historical accepted baseline evidence, not results of this deployment attempt. No new feature, backup tooling, C3/B3 expansion, package, merge, tag or commit was introduced.

**Next step requires a separately authorized narrow Editor workflow correction:** expose/reuse the existing guarded clean-server initializer for the approved local candidate with explicit user confirmation and destination checks, without broadly removing the local-project publication safeguard. Add focused workflow coverage, then repeat the cleaned-state check and actual Editor initialization. Fresh isolated retrieval, full candidate/source parity, Revisar build/review, publication and live verification remain mandatory gates. Do not package/distribute or claim release completion before those gates pass.

Once a release is live, **every future update requires a pre-write backup of both `/source/` and `/`**. The obsolete test deployment was not an editorial baseline for this attempt. No backup tooling was implemented. After a successful release, the planned handoff remains compatible package verification/distribution -> operational handoff -> backup/recovery design.

## Final Responsive Candidate - September 17 (Historical)

This section supersedes the earlier pending-decision and 540px-layout assessments below. Branch: `chore/verified-editor-cleanup-plan-2026-09-11`; start `70076c5`; final **`349bf12`**, pushed to that feature branch. Only three implementation files and two directly related test files were committed. Documentation and candidate content remain separate; unrelated user edits were preserved.

### Provider Diagnosis and Final Behavior

Computed-layout inspection after official `embed.js` processing showed a 900px application wrapper around a 540px iframe. The effective 540px maximum came from our `.instagram-media` CSS, not an unavoidable provider limit. The provider's observed inline iframe style supplied a 326px minimum and bottom margin, but the application rules overrode them. A temporary outer-only override to 900px was honored: the provider viewport expanded and square tiles grew from approximately 179px to 299px without changing internal provider DOM.

At 390px, the original fitting iframe was 351px wide with approximately 116px tiles. The official profile continued using three columns at every tested width; resizing its outer element did not switch to one/two columns. The final permitted alternative is local horizontal scrolling: the provider fills the content column up to 900px, with a 720px readable minimum inside an `overflow-x:auto` wrapper. The surrounding page does not scroll horizontally. The wrapper is focusable, named and has a visible keyboard focus outline. Native scrollbar/keyboard scrolling reaches the remaining columns; the external profile link remains outside the scroller.

| Physical viewport / zoom | Wrapper width | Iframe width | Tile width (approx.) | Behavior |
| --- | --- | --- | --- | --- |
| 1440 / 100% | 900px | 900px | 299px | Full content-column width, centered |
| 1024 / 100% | 900px | 900px | 299px | Full content-column width, centered |
| 768 / 100% | 650px | 720px | 239px | Local horizontal scroll only |
| 390 / 100% | 351px | 720px | 239px | Local horizontal scroll only |
| 1440 / 200% | 681px | 720px | 239px | Local horizontal scroll only |

Settled provider heights were 821px at 900px width and 701px at 720px width, matching the provider document height; no height/aspect hack was added. The first quick resize probe sampled an intermediate height, so the final check allowed provider layout to settle. Desktop/narrow/scrolled/zoom screenshots and measured geometry were reviewed. One official script, no horizontal page overflow, keyboard scrolling, zero privileged Editor scripts and the separate-origin Revisar sandbox were verified. When Instagram was blocked, the embed slot disappeared while biography/link remained and the page still fit. The provider's previously observed non-fatal `route config was null` warning remains external behavior, not a page-breaking error.

Limitation: this is still Instagram's three-column profile, not a reimplemented mobile feed. On narrow screens, users pan the bounded embed or follow the external profile link. No scraping, provider-internal DOM changes, API, OAuth, tokens or undocumented data access was introduced; provider inspection read geometry only.

### Applied Editorial Decisions

Candidate remains **`C:\Temp\labfonac-release-candidate-20260917`**, based on the September 16 read-only remote snapshot, with current accepted application code and assets. No new remote retrieval/drift check was made; the later release must check for newer remote edits before writing.

| Area | Final candidate treatment | Method |
| --- | --- | --- |
| Publicacoes | Disabled; 38 records and `scheduled_removal` metadata preserved | Editor Pagina disable, Save and native read-back |
| Active order | Sobre -> Linhas de Pesquisa -> Equipe -> Extensao -> Parcerias | Editor move controls, Save/read-back |
| Hero Publicacoes link | Removed `#trabalhos` action; other actions unchanged | Conteudo -> Site -> Apresentacao -> Links |
| Seção Teste | Permanently erased, including custom instance/UUID/navigation; schema remains v2 | Authorized one-time candidate-only `page.json` removal |
| Sobre | Removed only the structured `Missão:` label/text item; other four paragraphs byte-equivalent as strings | Conteudo -> Site -> Sobre -> Paragrafos, remove selected item, Save/read-back |
| Footer order | Institution, Coordenacao, Contato, Links Uteis | Small shared renderer correction; coordination inserted before contact structure, not matched by editable title |
| Copyright | `© 1990–<current year>`; surrounding institutional wording retained | Existing renderer's fixed start year corrected to 1990; end year still `new Date().getFullYear()` |
| Equipe | All remote records preserved, especially Albert institution/photo and Carolina/Maria Luiza photos | Deliberately deferred to human Editor proof |

Permanent custom-instance deletion is not an ordinary supported Editor maintenance operation: `removeSection` disables, and the custom editor removes blocks but not the instance. No generalized deletion feature was built. The prompt explicitly authorizes this one-time cleanup of the known development artifact; only UUID `custom-58975ce6-93c9-42cd-bcdf-4f30de110c0f` was removed. Current schema validation passed before opening the candidate; Editor reopen showed no custom entry/orphan preview container, and generated output contained no custom section/navigation node. The hidden built-in Publicacoes template is retained by the existing renderer but is absent from active content/navigation.

Structural comparison against the remote base: **three of 79 JSON files differ; 76 unchanged**. Every intentional difference is accounted for:

- `page.json`: remove the known custom test instance; disable Publicacoes; place Linhas before Equipe. All other section metadata preserved.
- `site.json`: remove the Publicacoes hero action and the sole Missao structured paragraph. Header, remaining About paragraphs, footer data and other wording unchanged. Footer ordering/copyright require renderer changes, not JSON changes.
- `extensao.json`: the accepted enabled canonical PROVALE Instagram configuration retained from the preceding candidate run. Biography and other project fields unchanged.

All Equipe files, all partner files including CNPq, research descriptions, publication records and referenced images are preserved. No checkout `content/` overwrite, local-photo promotion or remote edit occurred. The earlier isolated image-picker test assets remain unused additive assets, not approved editorial logo/photo selections.

### Verification and Human Gate

Bounded actual Editor control/native-handler smoke passed: saved local open, focused Conteudo selection, Page disable/order/Save/read-back, enable/disable restoration, separate Page/Content save state, Site hero/About removal and local save/read-back, footer edit/Discard, existing named Equipe photo states, partner state, PROVALE/Instagram, close/reopen and Revisar generation. Native project-dialog selection was harness-supplied; this is automated evidence, not the human linguist acceptance. No Editor state/persistence/IPC files changed and no regression was found.

- Focused tests: **67 passed / 4 files** (Instagram/layout, footer and composition).
- Full suite: **421 passed / 30 files**, run once after candidate assembly. FTP tests were disposable localhost fixtures only.
- Final production build: **passed once**, both web/Editor entries; pre-existing dirty checkout `public/data.json` restored byte-for-byte. Separately, one real candidate Revisar build passed. No packaging command was run.
- Final generated review: expected five active sections, no stale `#trabalhos` link, no custom test instance, four preserved About paragraphs, correct footer order and dynamic copyright, no broken images. Existing header/layout behavior was not redesigned.
- Evidence: `C:\Temp\labfon-responsive-evidence-20260917`, including investigation/final geometry reports, content comparison, native action log, Editor smoke and screenshots.
- Preview remains `http://127.0.0.1:4188/labfonac/` while its local process is running.

**Next action: [human linguist Editor proof](HUMAN_EDITOR_PROOF_EQUIPE.md)** on Albert's institution/photo and Carolina's/Maria Luiza's photo choices. These values are intentionally reserved, not a request for further agent analysis. Then final candidate approval -> compatible packaging -> pre-write backup -> controlled source upgrade -> fresh retrieval/build parity -> reviewed production publication -> live verification/handoff. Stop here; no backup tooling, C3/B3 expansion, Site-logo work, generalized deletion/embed, packaging, production FTP write/source update or publication was started.

Backup/recovery remains the already-recorded post-release exploratory workflow requirement, not an implemented tab/tool and not a substitute for the required pre-write backup.

## September 17 Initial Usability Candidate (Historical)

Branch remains `chore/verified-editor-cleanup-plan-2026-09-11`. Start `c2dc0e2`; final code checkpoint **`70076c5`**, committed and pushed to that branch only. The commit contains only `src/css/main.css` and `tests/unit/extensao.test.js`. Documentation remains separate and uncommitted because of existing user edits; candidate editorial content is outside Git. No merge/tag or production deployment was triggered.

### Layout Correction

The wrapper was capped at 540px without horizontal centering. It is now a full-width grid wrapper with a centered provider element capped at 540px, zero minimum width and normalized outer margin. The Instagram heading/fallback link share its center. Provider-owned internal DOM, height/aspect handling, script loading, security and all Editor state/persistence code are unchanged.

Actual official profile rendering was checked in offscreen Electron at 1440px, 960px, 390px and 1440px with 200% zoom. Center error was 0px in every case; the provider measured 540px where space allowed and 351px at the narrow viewport. Its height adapted from 581px to 446px. No horizontal overflow, one provider script, visible associated fallback link. Desktop/narrow/zoom screenshots were inspected. The known provider `route config was null` warning recurred without preventing rendering; no page-breaking application error was observed.

### Candidate and Preserved Decisions

- Candidate: `C:\Temp\labfonac-release-candidate-20260917`.
- Base: the September 16 read-only remote snapshot recorded below, not checkout content. No new FTP retrieval or remote drift check was performed on September 17; recheck drift before eventual remote writes.
- Overlay: accepted current application/build/native code plus the CSS fix and `team-placeholder.svg`. The candidate uses a local `node_modules` junction to checkout dependencies for this exercise; it is not a portable release package.
- Through the Editor, enabled/saved PROVALE Instagram with the approved canonical URL/provider. Existing enabled Extensao, biography, founder behavior, CNPq and other remote content were preserved.
- Temporary ordinary edits were discarded or saved/read back/restored through the Editor. Temporary section disable/enable/reordering was saved, then the exact remote order restored through the Editor. Structural comparison proves **78 of 79 JSON files unchanged**, including `page.json`; only `extensao.json` differs, by the accepted Instagram configuration.
- Final order remains Sobre, Equipe, Linhas, Publicacoes, Extensao, Parcerias, Seção Teste, all enabled. Schema v2/custom UUID retained. This preserves the safest current authority; it is not approval to publish the unresolved test section or other editorial choices.
- Albert's remote institution/photo, Carolina/Maria Luiza photos, About/footer wording and partner records remain unchanged. No disposable partner logo was promoted. Native picker exercises copied two unused images into the isolated candidate; Discard correctly retained additive assets without saving their references. They are test artifacts, not approved editorial assets.
- Local preview: `http://127.0.0.1:4188/labfonac/` while the preview process is running. This serves the candidate's generated output, not the checkout build or production.

### Usability Matrix

Automated offscreen UI exercise, not a new human manual-acceptance claim. Real Editor controls and actual native open/save/image/build handlers were used, with isolated application settings. The OS file-dialog response was supplied by the harness; native file validation/copy still ran. FTP handlers were unavailable. No content JSON was hand-edited.

| Maintenance task | Editor path | Result / evidence | JSON/manual intervention needed? |
| --- | --- | --- | --- |
| Enable/disable section | Pagina | Pass: Extensao disable/save/re-enable/save; original state restored | No |
| Reorder sections | Pagina | Pass: move/save, restore original order/save; exact remote JSON retained | No |
| Edit Site/About/footer | Conteudo -> Site | Pass: ordinary dirty/Discard; title Save/native read-back/restore; About/footer edits discarded | No |
| Edit Equipe record | Conteudo -> Equipe | Pass: Albert's remote institution loaded; ordinary draft/Discard | No |
| Change/remove photo | Conteudo -> Equipe | Pass: existing photo loads; remove/Discard and native selection/copy/Discard | No; OS dialog automated |
| Edit Parceria/logo | Conteudo -> Parcerias | Pass: CAPES text edit/Discard; no-logo state and native selection/Discard | No; OS dialog automated |
| Edit Extensao/PROVALE | Conteudo -> Extensao | Pass: biography edit/Discard, preserved authoritative presentation | No |
| Configure Instagram | Extensao -> Instagram | Pass: enable/default canonical URL/Save/close/reopen | No |
| Generate review | Revisar | Pass: native candidate build and sandboxed generated preview | No |

Saved local project opening, focused selectors, clean state after native save/read-back, separate Pagina/Conteudo saves and Fechar projeto/reopen origin/content all passed. The privileged Editor document loaded zero Instagram scripts; generated review retains its existing separate-origin sandbox. No expected maintenance task required manual JSON or new UI; no capability gap or proven Editor regression was found. Harness timing/selector assumptions were corrected without application changes.

### Integrated Review and Verification

Generated review contains all composed sections and matching navigation, including the deliberately unresolved Teste entry. No broken local images were found. Tested section anchors clear the compact sticky header by approximately 24px. Header expanded/compact states, footer presence, managed assets, Instagram, fallback link, narrow viewport and 200% zoom passed the scoped checks. Founder data and the four Egressos remain unchanged.

- Focused layout/provider tests: **39 passed / 2 files**.
- Full suite: **419 passed / 30 files**, run once. FTP integration tests used disposable localhost fixtures only, not production.
- Final production build: **passed once**, generating both web and Editor entries; no `editor:build`/packaging. Existing dirty checkout `public/data.json` restored byte-for-byte after generation.
- Separately, Revisar built the disposable candidate twice: once during the temporary ordering exercise, then again after restoring its exact remote order. The second generated output is the reviewed candidate.
- Evidence: `C:\Temp\labfon-candidate-evidence-20260917`, including `editor-report.json`, `content-verification.json`, `review-report.json`, native action log and screenshots. These are local test artifacts, not a production backup.

**Stop for the same three maintainer decision groups below:** composition/Publicacoes/test section, About/footer coordination, and the named Equipe institution/photo choices. Apply approved choices through this candidate's Editor and review their effects before recommending packaging. No packaging, backup tooling, C3/B3 expansion, source upgrade, production FTP write or publication was started. Existing checkout content, settings and unrelated user files remain preserved.

### Post-Release Operational Follow-up

Devise a simple backup and recovery workflow suitable for non-technical maintainers; later evaluate whether it belongs in an Editor Backup tab or a parallel procedure/tool.

Record only: no Backup tab, ZIP/export, restore, scheduling, cloud integration or FTP changes were implemented. This follow-up does not delay candidate approval or replace the existing pre-rollout backup requirement.

## September 16 Audit (Historical Evidence)

## Evidence and Scope

- Branch: `chore/verified-editor-cleanup-plan-2026-09-11`; HEAD: `c2dc0e2` (`feat: add safe PROVALE Instagram profile embedding`).
- Accepted checkpoints: C2/UX `f8064e2`; Equipe `311109c`; Parcerias `456d5c5` and layout/shell `13eea53`; Site-logo implementation `fe9828f` closed as non-priority; Instagram `c2dc0e2`.
- Instagram: maintainer reports all nine focused checks passed, including save/reopen, privileged link-only preview, generated profile/grid and disable/restore. Acceptance is complete; package acceptance is separate.
- State A: maintained checkout, including existing uncommitted team-photo changes. State B: September 7 production milestone in `DEVELOPMENT_LOG.md`, historical only. State C: actual `/source/` retrieved at `2026-09-16T15:21:07.159Z` (12:21 Sao Paulo).
- Safe retrieval succeeded through the existing retrieval handler with a read-only FTP-command guard and an isolated temporary application workspace. It downloaded 189 files and listed 23 directories. Authentication, navigation, listing and download commands only; no server mutation or rotation of the user's existing workspace. Credentials were not recorded in this report.
- Local evidence root: `C:\Users\vil3l\AppData\Local\Temp\labfon-release-baseline-hVGkdO`; snapshot: `workspaces\lab-fon\current`; reports: `retrieval-report.json`, `comparison-report.json`. Temporary evidence is not a durable production backup.
- Compared all 79 content JSON files on each side: 69 semantically equal, ten different, no files missing on either side. Asset inventories: checkout 66, remote 62. All discovered content image references resolve on both sides.
- Actual remote editable content takes precedence over historical documentation. The live public site was not inspected; `/source/` does not prove what is currently published at `/`.

## Worktree Preservation

No application code was dirty at inspection. Existing changes comprise three Equipe JSON photo edits, generated `public/data.json`, the implementation plan, Equipe/Instagram retest documentation, a deleted `docs/Follow-up-prompt.md`, and local workspace settings. Untracked user files include prompts/audits/status documents, a personal CSV, `docs/image.png`, Albert's managed JPG and two `missing_avatar` assets. They remain untouched; no reset, stash, cleanup, staging or commit was performed.

The already-modified implementation plan can be reconciled by adding the dated current assessment and updating current status labels, retaining its historical evidence. That documentation reconciliation is performed in this run; it does not authorize committing unrelated files or treating the dirty tree as a release artifact.

## Decision Table

Paths below are relative to `content/` unless stated otherwise. Historical statements are evidence, not instructions to overwrite newer data.

| Area | Checkout A | Actual remote C / history B | Context and proposed treatment | Risk if wrong |
| --- | --- | --- | --- | --- |
| `page.json`: schema/custom | Legacy implicit v1, six built-ins | v2; seventh enabled empty `Seção Teste`, nav `Teste` | Preserve v2 and custom identity; propose disable section and nav, not deletion, subject to approval | Losing custom data or publishing a test menu |
| Composition order | Sobre, Linhas, Equipe, Publicacoes, Extensao, Parcerias | Sobre, Equipe, Linhas, Publicacoes, Extensao, Parcerias, test; history put Linhas before Equipe | Prefer current remote order; confirm with maintainer | Reverting an intentional editorial ordering |
| Publicacoes | Enabled, `scheduled_removal` | Also enabled with same lifecycle; historically disabled/absent | Explicit decision required: keep current enabled state or approve historical disabled state; preserve all records either way | Removing wanted publications or restoring unwanted navigation |
| Extensao | Disabled | Enabled; also enabled historically | Preserve enabled remote state; consistent with accepted PROVALE release intent | Hiding PROVALE/Instagram |
| `extensao.json`: Instagram | Disabled, source/provider null | Identical | Merge accepted enabled profile configuration into later candidate; not remotely now | Shipping an accepted feature switched off |
| `site.json`: About/footer | Identical on both sides | About: Manuella Carnaval (UFRJ), Carolina Silva (UFPB). Lab footer: Joao Moraes, Manuella Carnaval. PROVALE footer: Carolina Gomes da Silva, Manuella Carnaval, Juliana Dias | Roles may differ legitimately; maintainer supplies authoritative About/coordination wording | Incorrect institutional attribution |
| Site hero action | Publicacoes -> `#trabalhos` | Identical; history removed stale action when section disabled | Keep if Publicacoes stays enabled; omit from approved candidate if disabled. `#trabalhos` is the registered valid anchor | Broken/stale action after composition change |
| `equipe/albert-olivier-blaise-rilliard.json` | Institution `UFRJ`; new managed JPG | Institution `LINS`; `assets/images/avatar.webp` | Confirm institution and whether local photo is final; preserve remote pending decision. Do not silently reinterpret `LINS` as `LISN` | Incorrect affiliation or unintended test photo |
| `equipe/carolina-gomes-da-silva.json` | `foto: ""` | `assets/images/carolina_silva.jpeg` | Confirm whether local removal is editorial intent or acceptance-test residue | Removing an intended portrait |
| `equipe/maria-luiza-de-almeida-mattos-weinstein.json` | `foto: ""` | `assets/images/maria_luiza_weinstein.jpeg` | Same explicit photo decision | Removing an intended portrait |
| `linhas/fonetica-experimental.json` | `Fonêtica Experimental`; placeholder description | `Fonética Experimental`; substantive experimental/acoustic/articulatory/perceptual description | Preserve remote title and description | Replacing published content with placeholders |
| `linhas/prosodia-expressividade.json` | Placeholder description | Substantive expressive speech/emotions/attitudes description | Preserve remote verbatim | Editorial data loss |
| `linhas/prosodia-fonologia.json` | Placeholder description | Substantive suprasegmental organization description | Preserve remote verbatim | Editorial data loss |
| `linhas/prosodia-interfaces.json` | Placeholder description | Substantive interdisciplinary prosody description | Preserve remote verbatim | Editorial data loss |
| `linhas/prosodia-multimodal.json` | Placeholder description | Substantive speech/gesture/facial/body integration description | Preserve remote verbatim | Editorial data loss |
| `parcerias/capes.json` | Description without final period | Same text with final period | Preserve remote punctuation | Needless overwrite/churn |
| Partner logos | No `logo` fields in any of five records | Identical; CNPq present | Preserve text-only records. Accepted logo capability does not approve disposable CAPES logo content | Promoting test assets |

## Proposed Candidate

This is a remote-first candidate, not an applied merge. The conservative default retains enabled Publicacoes because both current copies agree; historical removal alone is insufficient authorization. The test-section disable remains a proposal requiring approval.

| Order | Section | Proposed enabled state |
| --- | --- | --- |
| 1 | Sobre | Yes |
| 2 | Equipe | Yes; confirm remote order |
| 3 | Linhas de Pesquisa | Yes; confirm remote order |
| 4 | Publicacoes | Yes pending explicit keep/disable decision |
| 5 | Extensao | Yes; accepted PROVALE intent |
| 6 | Parcerias | Yes |
| 7 | Seção Teste | Proposed No; navigation also hidden, approval required |

Retain custom ID `custom-58975ce6-93c9-42cd-bcdf-4f30de110c0f`, text variant, title and empty blocks, even if disabled. Retain publication records and lifecycle metadata even if Publicacoes is disabled. No automatic scheduled removal.

Already decided or preserved:

- Site identity, existing SVG/PNG/retina logo configuration, other About text and footer credits remain remote/current, subject only to the coordination clarification and conditional publication action above. Header-logo expansion is not a release requirement.
- Preserve all 27 remote team records pending the three-photo/institution decision. Joao Moraes remains founder-first in Docentes (`Fundador`, priority 0). Preserve all four Egressos as team-category records, not a separate page section.
- Preserve all five partners: CAPES, CNPq, FAPERJ, LISN and UFPB; no production logos are selected. Preserve the remote research-line descriptions and all unchanged content.
- Preserve the existing PROVALE biography and nested Extensao presentation, equal in both copies; no separate PROVALE top-level navigation. Image remains null, complementary text empty, coordination/social-link arrays unchanged.
- Merge this accepted Instagram configuration in the later approved candidate:

```json
{
  "enabled": true,
  "provider": "instagram",
  "source": "https://www.instagram.com/provaleinterinstitucional/"
}
```

Required assets: retain all 62 remote assets without cleanup; add the accepted runtime `public/assets/images/team-placeholder.svg`. Add `image-a6f439f4-47f0-49bc-8387-e14e315875b2.jpg` only if Albert's local photo is approved. Neither untracked `missing_avatar.svg` nor `missing_avatar.webp` is a required release asset. Existing explicit `avatar.webp` references remain explicit photos, not automatically converted to empty/no-photo values. The shared `logo_300x130.svg` hash difference is CRLF/LF only, not a different logo.

### Three Maintainer Decisions

1. **Composition:** keep Publicacoes enabled or disable it (and its hero action)? Keep remote Equipe-before-Linhas ordering? Disable and retain the empty test section and hide its navigation?
2. **Coordination:** confirm whether About and footer intentionally describe different roles, or provide the exact replacement wording/names.
3. **Equipe:** choose Albert's authoritative institution (`LINS` remotely versus `UFRJ` locally, or an explicitly supplied correction); approve/reject his new JPG and the local photo removals for Carolina and Maria Luiza. Default until approval: preserve remote values.

## Compatibility and Release Gates

The current `validatePageComposition` accepts the retrieved schema-v2 document with no diagnostics and preserves the custom section. Remote/current composition and custom-schema module text is identical after line-ending normalization; the initial raw hash differences are not semantic schema divergence. Do not downgrade to the checkout's unversioned page or drop custom fields.

The remote source is not feature-current: it lacks `src/js/sections/provale-instagram.js` and `src/js/sections/team-photo.js`; its older `JSONAdapter` mapping drops optional partner `logo`. Related editor/Extensao code also differs. These are concrete reasons to upgrade the source code and required runtime assets before fresh retrieval/build/publication, even though existing remote content passes current composition validation. Native `desktop/main.cjs` is outside the editable-source bundle by design; its absence there is not a defect.

Empty photos and optional partner logos are supported by the accepted current editor/renderers, but require that matching runtime code. Instagram uses existing enabled/provider/source fields, not a new content schema. Preserve absent optional logo fields and valid managed relative paths. Referenced assets exist; no content-read/schema blocker was found in the narrow checks.

**Release is not authorized/ready:** editorial decisions remain, remote code must be upgraded in a controlled operation, and a compatible package has not been verified here. Since remote source already has v2 custom content, older pre-C2 editors must not overwrite it now. The historically verified September 7 binary is not evidence of current compatibility. No new application defect is inferred and no feature expansion is justified by these release gates.

## Next Authorized Slice

After maintainer baseline approval, recheck remote drift and assemble only the approved content/configuration plus accepted source/runtime assets in an isolated release working copy. Never copy checkout `content/` wholesale over the newer remote editorial data. Generate consolidated data from that approved candidate during acceptance, rather than treating today's dirty `public/data.json` as authoritative.

Remaining sequence: **integrated release acceptance -> compatible packaging -> backup/controlled source upgrade -> fresh retrieval/build parity -> reviewed production publication -> live verification/handoff**. Before the first remote write, obtain explicit authorization, back up the actual editable source (and deployed output before publication), verify maintainer package compatibility and preserve hosting metadata. Stop on drift or failed parity; do not use a checkout build as a substitute for the source-retrieval workflow.

C3, B3, Site-logo expansion, generic embeds/providers, Graph API/OAuth/tokens/scraping, auto-updater, active-navigation polish and unrelated redesign remain frozen. The focused nine-check Instagram acceptance is not automatically repeated.

Verification this run: read-only structured comparison, asset-reference checks and current schema validation; documentation whitespace/diff review. No application/content edits, full test-suite rerun, build, installer, packaging, FTP write, publication, merge or tag.
