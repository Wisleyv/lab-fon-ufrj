# Delivery inventory and preservation decisions — 2026-10-03

Dated Phase 1 inventory. Its documentation-state table records the input to Phase 2, not an assertion that subsequent revisions are still missing. Current operational documentation is the [revised guide](GUIA-DO-USUARIO.md) and [final technical handover](ARCHITECTURE_AND_OPERATIONS_HANDOVER.md); [release 1.1.0 and acceptance](RELEASE_CANDIDATE_1.1.0.md) close the software/documentation gates. Custody requirements below remain pending institutional designation/receipt.

Phase 1 only. Software authority: `work/post-v1.0-hardening-2026-10-02`, commit `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7`. This inventory records dispositions; it authorizes no deletion, production operation, release or history rewrite. [Production convergence](PRODUCTION_CONVERGENCE_2026-10-03.md) records the accepted operational state. Private locators belong in the custody map accompanying the evidence, outside Git; none is a prerequisite path for a future installation.

## Supplied screenshots

All seven PNG originals were visually inspected and left unchanged. Their tabs and native menus match the accepted UI. None establishes the installed version or a successful connected workflow: the project is unopened and most actions are disabled. Publication approval below concerns the visible image only, not unpublished metadata or an archive containing other files.

| Original | Actual coverage | Publication suitability and disposition |
| --- | --- | --- |
| `aba-1.png` | Conectar: connection fields, TLS selected, saved-password indicator, connection/configuration/test controls. | Hold: a nonempty username has unresolved provenance. The server is a bracketed placeholder; no password is visible. Confirm that the username is fictitious or obtain an approved clean capture/redacted derivative in Phase 2. |
| `aba-2.png` | Projeto: remote-open action and collapsed advanced options. | Usable as orientation with caption. An old temporary release-candidate path is visible; it contains no personal username but must not become an instruction or required directory. Replace for the successful remote-open procedure. |
| `aba-2a.png` | Projeto with advanced local-project options expanded. | Same path caveat. Optional advanced-use illustration, partly redundant with `aba-2.png`; choose one for the main sequence. |
| `aba-3.png` | Conteúdo: disabled Site selector and editing actions, unopened-project warning. | Safe blocked-state/orientation image; unsuitable as evidence of editing or saving a record. |
| `aba-4.png` | Página: Sobre, Equipe, Linhas, Extensão and Parcerias enabled; Publicações available but disabled; ordering controls disabled; custom-section area partly visible. | Safe orientation, consistent with visible accepted composition. Does not establish active editing, saved changes or preview. |
| `aba-5.png` | Revisar: Gerar site and Prévia disabled. | Safe explanation of the unopened-project state; replace for the successful review procedure. |
| `aba-6.png` | Publicar: Atualizar site, Recuperar versão anterior and Revisar limpeza remota, disabled without a project. | Safe current action overview. Missing confirmation, progress, outcome and recovery/review evidence. |

Other than the connection username and the two illustrative local paths, no visible personal path, actual server address or exposed secret was found. Preserve originals privately; approve any selected publication derivative separately. Do not infer successful operations from disabled controls.

Missing operational coverage for Phase 2:

- Successful connection and completed remote-project retrieval, with meaningful status visible.
- Active representative content form, saving a change and choosing/using an image.
- Active page-composition change, save and preview; custom sections only if the guide teaches them.
- Successful site generation and the generated-site preview.
- Guided Atualizar site confirmation, progress and successful outcome; combine captures where readable.
- Recovery domain choice and outcome, including fresh retrieval after source recovery.
- Read-only remote-cleanup review result, explicitly showing that execution is unavailable.

An About capture is optional unless the guide needs to demonstrate version identification. Installer security guidance can remain text. Capture missing states using the real Editor and an isolated/disposable project; do not repeat production operations merely to obtain illustrations.

## Artifact dispositions

| Category and identification | Disposition | Long-term authority/custody |
| --- | --- | --- |
| Tracked application/desktop code, adapters/renderers, build configuration, lockfile, scripts, LICENSE and documentation | Retain in public Git. Existing architecture is settled. A script's temporary-looking name alone does not justify deletion. | Project repository and future approved release. |
| Tracked tests, synthetic `examples/` data, fixtures, software branding/icons and placeholders | Retain in public Git: required contracts, clone/build inputs and test evidence. Examples are DEMO data, never production content. | Repository. Keep tracked software assets distinct from institutional photographs. |
| Ignored `content/`, institutional `public/data.json`, `public/publication_references.json`, photographs and raw editorial/import material | Preserve outside Git; archive privately before any cleanup. Real content is not regenerated from software examples. | Institutional content custodian; maintained remote source plus a separately verified private archive. |
| Institutional preservation ledger and retained original files | Preserve the 182-file SHA-256 ledger with its corresponding files; retain provenance and semantic comparison evidence. | Private ORIGINAL-INSTITUTIONAL-CONTENT archive. A ledger alone is not a backup. |
| Complete production preflight source/public backups and successful guided-update recovery transactions | Archive privately, including manifests, snapshots, payloads, checksums and journals as a coherent set. No pruning during finalization. | Private PRODUCTION-CONVERGENCE-2026-10-03 archive; recovery custodian. |
| Production convergence metadata, progress/verification reports, selected candidate/live images and independent fresh retrieval | Preserve privately. Retain the portable institutional project, locked-dependency/build evidence and checksums; publish only the sanitized summary. | Same production archive. Fresh retrieval is continuity evidence, not disposable wholesale. |
| Installed Editor `userData`, profiles, workspaces, recovery and guided-update receipts | Private, machine-specific operational state. Preserve unique work/recovery evidence; review caches separately. Never include saved-password/profile files in public Git or generic delivery bundles. | Authorized maintainer workstation; required recovery material transferred to the private archive. |
| Credentials, local-only connection notes, account/setup helpers and encrypted saved-password files | Retain only where authorized; manual privacy review. Obtain institutional access independently through the access administrator. Encrypted local storage is not portable credential delivery. | Separate secure access custody; no credentials in this inventory, guide or ordinary archive. |
| Disposable FTP acceptance baseline, failure/interruption/retry results, UI evidence and recovery receipts | Preserve accepted results and recovery evidence privately. Review helper/account/configuration files before sharing. Disposable payloads are test evidence, not production authority. | Private DISPOSABLE-ACCEPTANCE-POST-V1 archive; sanitized acceptance report remains in Git. |
| Generated `dist/`, `editor-dist/`, dependency/cache directories and test build copies | Safe to remove later only after checking that no unique content/evidence is present and required reports/projects are archived. These outputs can contain institutional content even when reproducible. | Rebuild from the accepted project and lockfile; no public archive of private build contents by default. |
| Baseline and software-only verification copies under `.temp/` | Preserve minimal provenance, results and unique artifacts first. Dependencies and generated output are later cleanup candidates; retain the preservation ledger. | Private verification evidence. Software-only build success does not prove a real production-content build. |
| Repeated retry stdout/stderr, worker/PID files, browser caches and diagnostic-only captures | No separate delivery value once unique diagnostics are extracted and accepted outcomes archived. Manual check for secrets/unique evidence precedes later deletion. | Temporary maintainer storage until review. |
| Older dirty OneDrive worktree and other candidate/worktree copies | Preserve and manually reconcile unique/staged/untracked user work. Do not select a release candidate by directory name or delete a worktree automatically. | Maintainer; accepted post-v1 branch is the software authority for this phase. |
| Legacy release directories, installers/ZIPs, `win-unpacked` and build configuration records | Review manually. Identify hashes/provenance against the published v1.0.0 assets; preserve accepted historical release evidence and any institutional project before considering duplicates removable. | HISTORIC-V1-RELEASE private archive and approved public release assets. |
| Supplied guide screenshots and older native/visual acceptance captures | Preserve originals with checksums. Publish only selected reviewed images; retain historical UI evidence separately. | SCREENSHOT-ORIGINALS private archive; approved derivatives may later belong in Git. |
| Historical decision/session/retest documents | Retain as historical evidence with dated context; do not use obsolete proposals or cleanup manifests as current execution authority. | Public Git if already sanitized/tracked; raw supporting evidence private. |
| Remote legacy/unmanaged files and uncertain historical assets | Preserve. Fresh review classified 26 obsolete artifacts, but deletion remains disabled and unauthorised. Unknown assets and hosting metadata are not automatic cleanup candidates. | Production server plus verified private baseline/retrieval evidence. |

`docs/disposable_ftp_connection.md` is local-only through a worktree-local exclusion, not a shared `.gitignore` rule. Do not force-add it or copy its contents into delivery documents. Record the shared-protection gap for the later hygiene phase. Institutional data also remains in historical Git revisions; untracking the current tree does not erase history. Any history/publication policy change requires a separate decision.

## Preservation requirements and remaining ambiguity

Use the five archive labels above to bind reports to their payloads without depending on this workstation's paths. A private locator map has been prepared with the current source locations and screenshot hashes. The institutional custodian and actual durable archive destination still require designation; no institutional storage service or account is assumed to exist.

Before any later deletion or final custody handoff, the designated custodian must acknowledge receipt, verify file counts/checksums and readability, and confirm that recovery manifests resolve to all required payloads. Preserve source/public separation and transaction identity; perform any restoration rehearsal in an isolated target. Keep secure access provisioning separate. Copying a summary report alone does not satisfy custody.

The older worktree's user changes, unclassified legacy release folders and mixed temporary copies require manual reconciliation before their cleanup. This does not block a documentation draft. The unresolved screenshot username blocks publication of that image; custody designation blocks destructive cleanup/final handoff. No remaining inventory ambiguity requires reopening architecture or blocks Phase 2 drafting.

## Documentation-state map

| Document/group | State and Phase 2 use |
| --- | --- |
| `GUIA-DO-USUARIO.md` | Needs revision. Reuse installation/editing basics; section 5 describes the superseded separate remote-source update/publication flow. Teach guided Atualizar site, recovery, read-only cleanup review and current screenshots. |
| `../README.md` | Current core architecture, software/data/license boundary and commands are reusable. Clarify reproducible developer prerequisites later; examples-only builds are not production builds. |
| `../DEPLOYMENT.md` | Reuse static hosting, unsigned Windows safety and packaging foundations. Revise the old two-step update/publication flow in Phase 2; version/asset metadata belongs to the later release phase. |
| `../DOCUMENTATION_INDEX.md` | Navigation retained; Phase 1 links added. Broader guide/handover navigation waits for those documents. |
| `PHASE_7_GUIDED_UPDATE_VERIFICATION.md`, `PHASE_8_CLEANUP_VERIFICATION.md`, `DISPOSABLE_FTP_ACCEPTANCE_REPORT.md` | Reusable accepted implementation/acceptance evidence. Guided operation checks its own prerequisites; cleanup remains read-only. Treat dated plans/old proposal totals as historical. |
| `BACKUP_RECOVERY_CONTRACT.md` | Reuse checksum-verified, separate-domain recovery and retention contracts. Read its historical standalone-flow statements with the Phase 7 guided compensation behavior, not as conflicting user instructions. |
| `CUSTOM_SECTION_CONTRACT.md`, C2 acceptance report, `RESEARCH_LINES_SCHEMA.md`, architectural decision and `../AGENTS.md` | Reuse settled semantics. Custom-section contract header still says proposal/awaiting approval despite accepted C2 implementation: clarify status in Phase 2 using acceptance evidence, without redesign. |
| `REPOSITORY_CONTENT_BOUNDARY.md` | Reusable accepted data boundary and test caveats. Its then-future production note is superseded by the new convergence record. Six recorded baseline test failures are not evidence of a fully green suite. |
| `POST_V1_SESSION_HANDOFF.md` | Historical checkpoint at `71581ea`; its pending-production state is superseded by the new record. Preserve dated checkpoint context. |
| Release baseline, build-repair/native acceptance/retrieval reports, development log, sanitization/retest/session records | Historical/reference evidence. Reuse relevant accepted observations; do not treat old paths, counts or release-preparation instructions as current commands. |
| Older backend/WordPress proposals, completed implementation plans and old cleanup proposal JSON | Historical/reference-only; redundant as operational instructions, retained for decision history. Old cleanup proposal is not deletion approval. |
| Published v1.0.0 release and package metadata | Historical released version / current unchanged metadata. Post-v1 source and production acceptance do not constitute a new installed release. Update release-facing identity only in the authorized release phase. |
| Illustrated practical guide and technical architecture/operations handover | Completion/drafting missing: Phase 2 scope. This inventory is not the handover draft. |
| Validated reproducibility prerequisites, next-release changelog/checksums/installed acceptance, signed custody receipt | Missing delivery records for later verification, release and final custody phases respectively. No such verification or release is claimed here. |

## Exact next slice

Begin Phase 2 with `GUIA-DO-USUARIO.md`, section 5: replace the superseded two-step procedure with the accepted guided Atualizar site flow, using Phase 7 and disposable acceptance as authorities. Then cover recovery and read-only cleanup review, select safe supplied images and obtain the missing operational states. Align deployment wording and navigation; draft the technical handover within Phase 2's approved scope. Resolve the held image before publishing it. Do not change version metadata, package, clean, or touch production as part of obtaining documentation evidence.
