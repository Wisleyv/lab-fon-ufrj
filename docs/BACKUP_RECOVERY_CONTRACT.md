# Local Backup and Recovery Contract

Phase 5 adds recovery to the existing separate source-update and publication actions. It does not unify their workflow or create remote backup directories.

## Storage and evidence

Backups live at `<Electron userData>/publish/recovery/transactions/<UTC timestamp>-<UUID>/`. On the current Windows installation, Electron user data is normally `%APPDATA%/lab-fon-ufrj`; the application resolves its actual path using `app.getPath("userData")`.

Each transaction has atomic `transaction.json` metadata and separate `source/files/` and `public/files/` trees. The snapshot covers every file that the operation may overwrite or explicitly delete. It records the prior file bytes, length and SHA-256, or explicit absence for a new file, plus the intended result's length and SHA-256. Untouched remote files are outside its recovery scope. This is a complete snapshot of the mutation set, not a full archival mirror of the account.

Metadata identifies the operation, creation/verification times, fixed remote root, intended source revision and connection identity hash. It contains no passwords. Source and public snapshots share a transaction when publication follows a successful source update of the same portable-source bytes. Later attempts retain a link to that source transaction. Source initialization also protects its mutation set, preserving `.htaccess` and `.ftpquota`.

Backup capture and local read-back verification must complete before any remote write. Remote results are checked against the intended SHA-256 hashes, including explicit deletions. Persisted states distinguish capture, verified backup, mutation in progress, success, failed capture and possibly partial mutation. An interrupted `mutating` operation remains recoverable from its verified snapshot.

## Explicit recovery

The Publicar tab offers **Recuperar versão anterior**. It requires valid connection data, no unsaved edits and no concurrent Editor operation. A native confirmation offers the most recent eligible source/public backup for that connection. Only fixed `/source` and `/` targets are accepted; users do not enter backup or destination paths.

Saved-file integrity is verified before restoration can mutate the remote tree. The current affected remote files are backed up before recovery changes them. Restoration returns the tracked files to their previous state and removes only transaction-created files whose prior state was recorded as absent. Untouched files, orphan candidates, quota metadata and source protection metadata are not cleanup targets.

Failed retries retain the original recovery target, combining their mutation sets so newly attempted paths are also covered. A failed restoration keeps both original and pre-restoration snapshots; the next explicit recovery continues from the original protected version. Successful restoration marks the original snapshot resolved.

Public recovery never changes `/source`. A failed publication does not automatically roll back a successful source update. Source recovery is separately and explicitly confirmed; afterwards the Editor closes the local project so a fresh remote retrieval is required. Public recovery clears the publication receipt while retaining the source context.

Publication retries use the existing connection/build/unsaved-change checks and take a new snapshot. No background retry or automatic rollback is performed. During transfer or network failure the live public tree may be partial until recovery succeeds; backup availability does not imply an atomic remote publication.

Phase 7 composes these unchanged operations within the explicitly confirmed **Atualizar site** action: the guided coordinator attempts public-only compensation after a partial publication, retains pending recovery on failure, and requires recovery before retry. Standalone operation behavior, snapshot scope, source authority and retention policy are unchanged. See `PHASE_7_GUIDED_UPDATE_VERIFICATION.md`.

## Retention

After success, keep the newest five fully successful transactions. Failed, interrupted, incomplete and damaged records are preserved. Transactions referenced by another recovery chain are also preserved even beyond that limit. Thus failure history can use additional disk space; a disk/capture failure blocks mutation instead of discarding evidence. Retention errors are reported as pending and do not invalidate a successfully verified remote operation.

## Limits for later phases

- Backups and full checksum verification add download traffic; Phase 6 must account for this cost without weakening integrity.
- FTP provides no transaction lock or atomic account snapshot. Other maintainers must not write concurrently during capture, update or recovery.
- Only mutation-set files are recoverable; this foundation does not replace a full account archive.
- Recovery currently presents the newest eligible snapshot per domain; historical backup browsing is deferred.
- Public availability during transfer remains non-atomic; Phase 7 can introduce a separately verified publication strategy.
- Source/project snapshots do not archive dependencies or rebuild the installed Editor.
- The native confirmation and actual remote restoration require manual acceptance; automated tests use local filesystem doubles and never contact production.

No orphan assets are classified again or acted on by this contract.
