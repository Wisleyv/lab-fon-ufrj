# Disposable FTP acceptance report

## Scope and method

Accepted post-v1 implementation and build repair were preserved. The user-reported successful guided update remains accepted. Remaining checks used only the explicitly authorized isolated FTP account, with credentials read from the supplied document into memory. A complete pre-run archive, independent native user-data directory, transaction journals and sanitized evidence are retained under `C:/Temp/labfonac-acceptance-run/`.

Failure/retry was driven through the existing native guided coordinator with real FTP. Interruption used the real Electron main-process IPC operation, forced termination of that owned Electron process tree, and restart with the same recovery storage. Explicit recovery, fresh retrieval, local generation and cleanup review used the actual Electron renderer controls and native confirmation dialogs, driven through local CDP and Windows UI Automation. No application code was changed to manufacture failures. Verification covered FTP file bytes/checksums and live Electron state, not a newly supplied isolated HTTP endpoint.

A is the pre-run baseline; B and C are harmless test markers appended to a saved description. States below refer to the completed outcome of each scenario, not to production.

| Scenario | Result | Stage / injection | Final source / public | Recovery or retry outcome |
| --- | --- | --- | --- | --- |
| Public failure and retry | Pass | After verified public backup and mutation start, temporarily replaced the public index path with an empty directory | B / B | Publication and compensation correctly remained pending while the blocker existed. Removing that test-only blocker allowed recovery and retry from the same source receipt. No canonical source rollback occurred. |
| Process interruption / reconciliation | Pass | Killed the isolated Electron process tree after public C was observable, while checksum verification and receipt completion were unfinished | C / C | Restart reconciled the mutating snapshot, recovered the previous public version, rebuilt and republished C. Recorded stages: validation, recovery, validation, build, publication, complete; no repeated source-update stage. |
| Explicit public recovery | Pass | Selected Restaurar site publicado in the real native confirmation | C / B | Previous tracked public bytes restored; source hash unchanged; working project stayed open. |
| Explicit source recovery / fresh retrieval | Pass | Selected Restaurar projeto editável in the real native confirmation | B / B | Previous source restored; public data hash unchanged; project closed; Projeto > Abrir projeto remoto was enabled and visible. Fresh retrieval and Gerar site then succeeded. |
| Read-only cleanup review | Pass | Publicar > Manutenção > Revisar limpeza remota after fresh retrieval/local build | B / B, unchanged | Independent before/after inventories and SHA-256 evidence matched, including observed hosting metadata. No deletion control was exposed. |

The temporary failure fixture was removed. The account was deliberately left coherent at B/B for inspection, not reset to A. Historical/uncertain media and unrelated server files were not removed.

## Recovery/navigation finding

No correctness or usability defect was reproduced in the reported no-project-open case. Closing the working project is required after explicit source recovery because its local content may be stale. The success message requires fresh remote retrieval, and the Projeto tab exposes an enabled Abrir projeto remoto action. There is no additional project-selection dialog: the workflow has one fixed editable `/source/` location.

Public-only recovery did not close an already-open project. Restart itself begins without an open renderer project; public recovery is not an implicit project-open action. The domain selected in the earlier user observation was not recorded, so that historical event cannot be conclusively assigned to a particular recovery choice. The directly exercised source/public behaviors match their respective contracts.

The UI busy guard is intentional. Failure was injected externally rather than by bypassing that guard or adding an interruption control. A restart-automation timing issue was resolved by waiting for renderer initialization and resuming the same interrupted journal; no application correction was made.

## Cleanup evidence

This account's fresh review is not the historical mirror's proposal and is not production authorization.

- Source/public evidence both matched the current local revisions.
- 20 source Editor/utility paths: 216,973 bytes.
- 5 public Editor/superseded-bundle paths: 169,671 bytes.
- Total classification: 25 paths, 386,644 bytes; zero media deletion candidates.
- Manifest ID: `2f6825844909879fc0f87b1df9cf9c5dd24a9e7fec959c561794799da47d8ee4`.
- Independent before and after digest: `20d1dc6674aca1077c96e367f2f50860156c709cacb06cd91aa5148cccc86c31`.
- The exact manifest remains in the isolated local `userData/publish/cleanup-reviews/` directory. Classification is not authorization; no listed candidate was deleted.

## Gate and safety

The requested workflow acceptance is complete and ready for the post-acceptance checkpoint gate. No application correction is required first based on these scenarios. Git checkpointing and all production operations still require a separate request. Cleanup execution remains hard-disabled; fresh production evidence, exact human approval and verified recovery remain prerequisites for any future production cleanup.

Deprecation warnings remain non-blocking observations. No new dependency correctness/security failure was demonstrated, and no maintenance/upgrade work was undertaken. The earlier native icon configuration test was not replaced by a separate visual icon acceptance in this workflow run.

Only the supplied isolated account was accessed over FTP. Credentials were not printed, copied into scripts/reports, saved as an Editor connection profile/password, or committed. The pre-existing user-supplied credential document remains unchanged; its path was added to local Git `info/exclude` to prevent accidental ordinary staging. This does not publish an ignore-rule change or erase the supplied document.

Evidence files: `failure-evidence.json`, `interruption-evidence.json`, `ui-evidence.json`, and `baseline-inventory.json` in the external acceptance folder. Local snapshots remain preserved. The owned Electron test instance was closed; other Editor instances were not terminated.

No production access/mutation, cleanup execution, application-code repair, packaging, commit, push, tag, or release occurred. No broad automated suite was rerun. Final documentation whitespace validation used `git diff --check`.
