# Manual Electron acceptance record

## Current status

Worktree: `C:/Temp/labfonac-post-v1.0`.
Branch: `work/post-v1.0-hardening-2026-10-02`.

This record distinguishes user-reported manual acceptance from automated verification and assisted real-FTP/Electron acceptance. It does not authorize production operations or cleanup execution. See [DISPOSABLE_FTP_ACCEPTANCE_REPORT.md](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md) for the completed remaining scenarios.

| Scenario | Manual status | Evidence |
| --- | --- | --- |
| Gerar site after compatibility repair | Accepted | User confirms generation succeeds in the updated prompt |
| Generated local preview | Accepted | User confirms local generation/preview works |
| Development Editor usability | Accepted | User confirms repaired Editor is usable |
| Native window icon appearance | Not separately confirmed | Configuration tested automatically; no explicit visual result reported |
| Guided Atualizar site | Accepted | User reports Pass |
| Public failure and retry | Pass, assisted | Real FTP path blocker after backup; recovery/retry completed with source B preserved |
| Interruption and reconciliation | Pass, assisted | Real Electron process killed before verification completion; restart recovered/rebuilt/published C without repeating source update |
| Explicit public recovery | Pass, assisted | Native confirmation restored public B, preserved source C and kept project open |
| Explicit source recovery and fresh retrieval | Pass, assisted | Native confirmation restored source B; project closed; visible retrieval action and fresh retrieval/build succeeded |
| Read-only cleanup review | Pass, assisted | Before/after hashes matched; 25 paths classified; deletion remained unavailable |

The previously reported generation failure was repaired and manually accepted; it is not an open failure. npm deprecation warnings are non-blocking observations. They did not prevent generation and do not authorize dependency modernization. Existing dependency audit findings remain outside this acceptance slice unless a concrete failure is demonstrated.

## Resume point and precautions

The procedure below is retained for repeatability; the requested remaining scenarios have now completed. The repair requires no config migration or manual dependency installation. First-time generation in a newly retrieved workspace may take longer while locked local dependencies are prepared.

Use only an isolated disposable FTP account whose `/` cannot reach production. A subfolder in the production account is not sufficient because the Editor operates on fixed `/source/` and `/`. Confirm the host/account before each modifying action; do not include passwords in acceptance reports.

Keep a complete FileZilla baseline including hidden hosting files, exclusive test-account access, and a known public URL for the test site. If no isolated account or controllable test-server outage is available, mark those scenarios untested rather than substituting production or manufacturing a failure there.

Keep the same saved project, local backups, and journals during retry/interruption tests. Do not retrieve again merely to resolve an interrupted operation, because reconciliation must first be tested against the preserved state.

## Remaining manual sequence

1. **Successful guided update.** Save a harmless content marker `TESTE PHASE 7 A`. Under Publicar, press Atualizar site and confirm. Observe stages and busy guards through explicit success. Using FileZilla, inspect the saved marker in the appropriate `/source/content/` record; verify it also appears on the test website after a cache-bypassing refresh. No separate source update or preliminary manual build should be needed.
2. **Failure and retry.** Save marker B. Start updating, then interrupt only the disposable FTP server/session after public publication has actually begun. Record the stage and full error. While disconnected, restoration may remain pending; success must not be reported. Confirm the completed source still contains B. Restore connectivity and use Tentar atualizar novamente. Expect pending public recovery to be resolved before publication, then eventual agreement of source and public B. An interruption during validation/source/backup does not prove the public-mutation failure case; record it as an earlier-stage result.
3. **Interruption and reconciliation.** Save marker C. Force-close only the test Electron process during public publication. Restart the development Editor from the same worktree, retain its saved workspace/journals/backups, reconnect to the same test account, and reopen the saved project if offered. Retry. Expect reconciliation/recovery where needed, followed by explicit success and source/public C. If the transfer completed before termination, mark the interruption attempt inconclusive and repeat safely.
4. **Explicit public recovery.** After a known completed update, choose Recuperar versão anterior, inspect the timestamps, and select Restaurar site publicado. Verify the affected files against the corresponding prior public baseline, not an unrelated older archive. Source must retain the latest marker. Record both the restoration message and observed public/source results.
5. **Explicit source recovery.** On the disposable account only, choose Restaurar projeto editável and verify the expected prior source bytes. The Editor should close the working project and require fresh remote retrieval. Retrieve again and complete a successful guided update before cleanup review. Source restoration is a separately confirmed action, not an automatic consequence of public failure.
6. **Read-only cleanup review.** After the successful guided update, open Publicar > Manutenção > Revisar limpeza remota. Record the current manifest ID, proposed paths/count/bytes, and retained uncertain assets/hosting metadata. Compare server listings and affected file bytes before and after review: nothing should change. Confirm cleanup execution remains unavailable. Zero candidates is valid for a clean disposable account; the historical 26-file proposal is not an expected live result.

During each operation, modifying controls should remain busy-guarded, stage messages should be understandable, and failure must not appear as success. Backups protect the mutation set, not the full account, and do not guarantee atomic FTP availability. The public site can be temporarily partial until recovery succeeds.

For any new failure, stop the affected scenario and preserve the stage, screenshot/full message, last known source/public markers, and backup/journal evidence. Do not repeatedly update, restore, clear caches, edit manifests, or delete backups as a workaround before diagnosis.

## Results to return

For each numbered scenario report: Pass / Fail / Untested / Inconclusive, stage reached, final source marker, final public marker, and any error message. For recovery, identify the domain and displayed timestamp. For cleanup, include the manifest ID and proposed list without credentials. Report the icon appearance separately if checked.

## Checkpoint gate

**Ready for the requested workflow checkpoint gate:** user-reported guided success and assisted remaining acceptance scenarios passed, with no reproduced correctness/usability defect requiring repair. The no-project-open state after source recovery is expected, and Projeto > Abrir projeto remoto was verified as discoverable and usable. This readiness does not authorize a Git checkpoint automatically.

Production access/mutation and actual cleanup remain separately unauthorized even after acceptance. This acceptance run accessed and modified only the authorized disposable account. No application-code change, packaging, commit, push, tag, or release occurred. No broad suite was rerun; local generation was exercised through the real Editor. See the linked report for scope, sanitized evidence, credential safeguards and final B/B state.
