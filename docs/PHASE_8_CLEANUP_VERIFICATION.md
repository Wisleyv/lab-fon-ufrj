# Phase 8: controlled remote cleanup

## Implementation

The native cleanup service composes the existing source/public manifests and recovery store. A read-only, on-demand `Manutencao` review saves a checksum-bound manifest locally and displays the exact proposed paths and sizes. Classification is not authorization.

Execution remains hard-disabled in the application. No deletion control is exposed through the renderer bridge. The implemented executor requires the saved manifest, identical fresh server evidence, exact path confirmation, and verified completed guided-update receipts. It captures and verifies existing recovery snapshots for both affected domains before removing individual files. It never recursively deletes directories or hosting metadata.

Failures before mutation leave remote files untouched. Interrupted or failed deletion is marked possibly partial, with existing explicit recovery able to restore the captured bytes. Source and public snapshots retain the established independent recovery semantics; cleanup does not roll back a successful canonical source update. Their shared cleanup manifest ID identifies the reviewed operation. Retry requires fresh evidence and confirmation rather than reuse of stale approval.

## Exact proposal and size

[PHASE_8_CLEANUP_PROPOSAL.json](PHASE_8_CLEANUP_PROPOSAL.json) records every classified path, size and checksum from the read-only `C:/tmp/backup` mirror (354 files). This is historical evidence, not a current-server inventory or authorization.

| Classification | Files | Bytes |
| --- | ---: | ---: |
| Currently eligible | 0 | 0 |
| Deferred source Editor/utility files | 20 | 223,656 |
| Deferred public Editor/superseded bundles | 6 | 206,690 |
| Conditional total after verified guided update | 26 | 430,346 |

The mirror matches neither the accepted source revision nor the current public build. Consequently, the executable proposal is empty. The 26 deferred paths may become eligible only after a successful verified guided update and a fresh review. Their approximately 420 KiB represents obsolete bytes, not a prediction of net deployment size or transfer-time savings.

No asset removal is approved. All 53 Phase 3 media candidates (22,862,090 bytes), the unresolved README (3,799 bytes), and both canonically referenced duplicate-image filenames remain untouched. Five historical mirror asset paths outside the current public manifest are also retained. Unknown files, uncertain entry types, and hosting dot-files/directories remain protected.

## Verification

- 102 focused tests passed across cleanup (19), Editor bootstrap (43), build boundary (8), guided update (15), recovery store (8), and publication (9).
- Cleanup fixtures cover exact approval, changed evidence/account, both-domain backup failures, damaged backup checksums, stale receipts, concurrent execution, uncertain/unsafe paths, acknowledged-but-incomplete deletion, interruption, failed restore, and successful byte-exact restore.
- An in-memory overlay of a verified guided update followed by the proposed cleanup converges to the source/public boundaries: both revisions match and no boundary exceptions survive. Neither the mirror nor production was modified by this simulation.
- Editor renderer and production builds succeeded. The final `dist` contains the public build. Final whitespace and unchanged asset-audit checks are recorded in the session report.

## Remaining production gate

1. Complete Phase 7 manual Electron acceptance, including success, failure, interruption, recovery, and retry on a disposable project.
2. Obtain explicit authorization for a separate production-cleanup run. The application mutation gate remains closed in this implementation.
3. Establish an exclusive maintenance window, complete a verified guided update, and generate a fresh live read-only inventory and manifest tied to that destination and those source/public revisions.
4. Review and approve the exact current manifest ID and path list. Rehearse restoration on disposable fixtures and verify both-domain local backups before any production deletion. The native final confirmation defaults to Cancel.
5. Execute only the explicitly approved files, verify surviving source/public content and public-site behavior, and remeasure size/retrieval afterwards. Any uncertain asset or changed evidence requires a new review, not inferred approval.

No production FTP access, deletion, publication, remote cleanup, packaging, commit, push, tag, or release was performed in this pass. Accepted Phase 1-7 changes remain uncommitted and preserved. Live-server convergence and manual Electron acceptance are not claimed.
