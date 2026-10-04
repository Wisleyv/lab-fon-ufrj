# Targeted FTPS performance repair — 2026-10-04

Implementation and acceptance on `fix/ftps-publication-performance`, based on `76ed92d`, followed by an authorized repository/documentation integration checkpoint. The implementation/acceptance pass did not commit, merge, package, install or publish a release. The integration checkpoint includes only this accepted repair, related tests and operational documentation. At that integration checkpoint, package/lockfile metadata and distribution remained v1.1.0. The later v1.1.1 packaging, maintainer acceptance and authorized release close this sprint; see the final result below.

## History and cause

The accepted Phase 6 record and commit `71581ea` explicitly limit the earlier two-client optimization to retrieval. Backup/publication costs were intentionally unchanged; this is not a publication concurrency regression.

The released source/public path uploads every manifest file, invokes `ensureDir()` per upload, and serializes backup/upload/read-back verification. `basic-ftp` walks absolute paths from `/` and issues MKD/CWD for each level. The October 4 transaction had 221 source and 109 public files, with only one changed file in each domain. Replaying its paths against the installed directory implementation yields 2,387 directory commands. An unauthenticated TLS NOOP probe measured approximately 130 ms per reply, making directory overhead alone approximately five minutes at that latency.

The approximately 154 MB source/site payload generated approximately 537 MB of transfer traffic through backup, upload, remote verification and the additional source receipt verification. The original recovery transaction lasted 21 min 24 s. These are operation elapsed times, not measurements of continuous socket bandwidth.

## Repair and preserved guarantees

- `desktop/remote-transfer.cjs` provides at most two sequential workers, per-session directory preparation, checksum-based upload omission, activity reporting and transfer metrics. A failure stops scheduling and joins every in-flight worker before rejection or recovery. A refused second session falls back to the authenticated primary without changing TLS settings.
- `desktop/retrieval-cache.cjs` shares the existing strict SHA-256 negotiation/parser with recovery. Reuse requires fresh full-file evidence, exact echoed path and valid full-file range. Unsupported or malformed responses download normally; size/time alone never authorize reuse.
- `desktop/recovery-store.cjs` still captures and locally verifies every positive-manifest backup before mutation. A matching fresh remote SHA-256 permits using identical local bytes as backup; otherwise it downloads the remote bytes. Remote verification uses fresh server SHA-256 when supported, otherwise full download and local SHA-256. Failed captures retain partial evidence but do not authorize mutation.
- `desktop/main.cjs` applies the protected upload plan to source update/publication and uses two-worker backup/verification. `desktop/guided-update.cjs` forwards real activity through the existing progress channel and UI message; no interface redesign or bridge change was required.

Fixed `/source/` and `/` boundaries, positive manifests, protected hosting files, certificate/hostname validation, independent domain recovery and backward-compatible version-1 journals/backups remain intact. The public entry point is uploaded after every asset worker joins. Explicit restoration keeps its established writes/deletions/order, prepares directories once and verifies its own undo backup. Successful source updates remain authoritative after public failure. Pre-publication source receipt verification remains independent and fresh.

Progress distinguishes protection, comparison, directory preparation, upload and verification, within the existing guided publication/recovery stages. It reports completed/total files, actual transfer bytes, unchanged files, elapsed time, rate, current file and 15-second inactivity. A closed observer cannot interrupt transfer bookkeeping. Byte counts exclude control/TLS overhead; data-channel listings can contribute to session progress totals.

## Instrumented fixture comparison

Baseline and repaired recovery/transfer implementations ran against the same 64-source/64-public-file fixture, one changed file per domain, no server HASH and simulated 5 ms command waits. Both retained the extra source verification and complete backups.

| Metric | Baseline | Repaired |
| --- | ---: | ---: |
| FTP commands | 1,828 | 694 |
| Directory commands | 896 | 14 |
| Downloads | 320 | 320 |
| Uploads | 128 | 2 |
| Payload bytes | 14,680,064 | 10,551,296 |
| Measured elapsed | 28.618 s | 5.995 s |

Synthetic wait timing is not a production speed claim. Separate regression fixtures with 64 files and one changed file demonstrate 64 → 1 uploads and 64 → 1 directory preparations. Without HASH, transfer bytes fell 6,291,456 → 4,227,072; with validated SHA-256, they fell to 65,536. Complete locally verified backups and successful restoration were required in both cases.

## Controlled production acceptance

The prompt authorized one controlled endpoint verification after fixture checks. An isolated workspace copied the completed October 4 project. Before connection, its source fingerprint and all 109 freshly built public hashes matched the successful installed-Editor transaction. A fresh isolated guided journal exercised the complete repaired workflow. Guards rejected uploads, directory creation, rename, append and deletion: acceptance could only succeed as an unchanged-content no-op.

The run completed at **10:47:20 São Paulo time**, taking **432.842 s (7 min 13 s)**. Both receipts recorded success and both persisted backup domains passed independent local checksum verification. Recovery transaction: `20261004T134023383Z-e76dbf1d-af65-4237-aa77-8b2ab0919cad`.

| Metric | Earlier installed-Editor operation | Repaired production no-op |
| --- | ---: | ---: |
| Source/public manifest files | 221 / 109 | 221 / 109 |
| Changed source/public files | 1 / 1 | 0 / 0 |
| Uploads | 330 | 0 |
| Per-file directory preparation calls | 327 | 0 |
| Directory commands from preparation | 2,387 | 0 |
| Download payload | included in approximately 537 MB total | 383,785,028 bytes |
| Upload payload | approximately 154 MB | 0 bytes |
| Data listing bytes | not separately instrumented | 180,688 bytes |
| Download calls | derived 881 | measured 881 |
| Maximum FTP client sessions | 1 | measured 2 |
| Elapsed | recorded 21 min 24 s | measured 7 min 13 s |

The repaired run recorded 2,060 total control commands, no MKD/STOR/deletion commands, and only three CWD commands for normal fixed-root navigation. The production server used download fallback rather than usable SHA-256 HASH. Remaining bulk downloads are intentional integrity/recovery checks. The original operation was a small change; the new operation was guarded no-op. Therefore this comparison demonstrates an approximately threefold improvement under real server latency, not an identical changed-content replay. Changed uploads, entry-point ordering, interruption/compensation and checksum conflicts were exercised locally, not by deliberately changing production content.

Private harnesses, instrumented results, progress records, project copies and backup payloads remain outside Git at `C:/Temp/labfon-ftps-performance-20261004`. Credentials were not printed or placed in repository files. The installed project, its recovery history and website content were not modified by acceptance.

## Verification and disposition

177 focused tests passed across 11 suites: protected transfer, recovery, guided update, retrieval/progress, publication, bootstrap, build, portable tooling, startup and cleanup compatibility. The consolidated run passed 174 tests; three additional progress/failure tests then passed in their relevant suites. Editor renderer and public production builds passed, as did CJS syntax checks and `git diff --check`.

Three cached-asset count assertions also failed on an untouched baseline checkout because the fixture contains an additional retained branding asset. The relevant retrieval regression expectations now count eligible fixture assets. The portable source round-trip requires only its changed content upload while asserting that the recovery snapshot still includes the full manifest.

## Final maintainer production acceptance and sprint closure

The maintainer accepted the packaged v1.1.1 candidate in the real production workflow on 2026-10-04:

| Operation | Observed elapsed |
| --- | ---: |
| Abrir projeto remoto — 221 files | 1 min 45 s |
| Gerar prévia do site | 13 s |
| Atualizar site | approximately 7 min |

The original problematic operation took 21 min 24 s (about 21 minutes). The repaired guarded workflow completed the accepted real-world update in about 7 minutes. Retrieval and preview were acceptable. The remaining update duration reflects the deliberate full-backup, integrity verification, independent source receipt and recovery safeguards described above, rather than an unresolved functional defect. Ordinary FTP transfer does not perform this complete workflow.

Photo optimization significantly reduced production media size. Institutional media remains outside the public software repository and release. No numerical media-size reduction was supplied for this final test. These are maintainer-reported observed acceptance timings, not independently instrumented transfer measurements, an identical-payload benchmark or a guarantee for other projects/servers. This final acceptance is distinct from the earlier instrumented, mutation-blocked no-op.

The [v1.1.1 release record](RELEASE_CANDIDATE_1.1.1.md) preserves source/artifact provenance and acceptance. Final release documentation changes no packaged input, so the accepted binaries are retained without rebuilding. No implementation task remains for this FTPS-performance issue. This patch sprint is complete; no production access or mutation, remote cleanup, dependency modernization, history rewrite or unrelated work is part of release closure. Publishing the Editor patch does not require another institutional-site update. The remaining work is institutional/documentary acceptance and custody, not another coding phase.
