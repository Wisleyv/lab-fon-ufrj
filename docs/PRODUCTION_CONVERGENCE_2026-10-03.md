# Accepted production convergence — 2026-10-03

Sanitized continuity record of the previously completed, authorized operation. Phase 1 reviewed existing evidence; it made no new production connection or change. This record supersedes the pending-production statements in the dated [post-v1 handoff](POST_V1_SESSION_HANDOFF.md) and [repository boundary report](REPOSITORY_CONTENT_BOUNDARY.md), while retaining their checkpoint context.

## Authority and result

- Software: `work/post-v1.0-hardening-2026-10-02`, commit `d46ccfdbe194ab9a00cf904f9cc4a6e9b8cf6cb7`.
- Real institutional content was used. All 182 preserved files retained recorded SHA-256 values; 85 canonical records matched the accepted parent checkpoint semantically. Examples/DEMO content was not deployed.
- The existing guided coordinator updated and verified 216 managed source files and 104 managed public build artifacts. Managed source and public output converged; legacy files outside those manifests were retained.
- Candidate build/public-output validation and live desktop/mobile Chromium checks passed. Navigation, branding, fonts, content images and candidate-equivalent data were verified; no page-level horizontal overflow remained. The external Instagram provider emitted a nonfatal diagnostic and used its intended internal scroller after initialization.
- Independent retrieval into an empty workspace returned 221 portable files with zero cache reuse. Portable validation, installation of locked dependencies and the fresh build passed. All 216 accepted source files and 104 published artifacts matched the candidate byte for byte. Five additional historical images were preserved with matching baseline source/public checksums.

| Managed domain | Accepted SHA-256 fingerprint |
| --- | --- |
| Source | `5fba86fa4a89413f87705ca1e52245b7457002931c7ae7626eeb424d452d0894` |
| Public output | `148d4966faa7d6643cbed1e2e6301aac747e23d66a67ba498026d4fa0fd80f82` |

## Recovery and preservation

Complete preflight backups captured 240 source files (77,087,055 bytes) and 113 public files (76,645,388 bytes). Their recovery transaction identifiers are:

- Source: `20261003T145706174Z-0f470f1a-2125-493a-8b6b-51e384cd098f`.
- Public: `20261003T150351497Z-aa3dac0b-0a86-42d8-a8bc-57cd4d7bb9cb`.

Guided source/public recovery receipts share transaction `20261003T150738095Z-3dad184e-d228-4418-a7bf-fee61fa2f916`. Both domain receipts recorded success and their local backup payloads passed final checksum verification. This is backup verification, not a production restoration rehearsal.

Raw records, payloads, journals, exact path/checksum manifests and institutional project copies remain private in the PRODUCTION-CONVERGENCE-2026-10-03 evidence set. Preserve the full set under designated institutional custody as specified in the [delivery inventory](DELIVERY_INVENTORY.md); this document cannot substitute for those backups. Access credentials are provisioned separately.

## Cleanup and limits

Fresh read-only cleanup review reported `sourceCurrent: true` and `publicCurrent: true`. Manifest `2d527d078776fbd6ad22720745e42912038c67547305f6ca1e66d04d63e8b2d4` classified 26 obsolete artifacts totaling 424,149 bytes: 20 source Editor/utility artifacts and six public artifacts. Cleanup execution remained hard-disabled; no deletion occurred. All 36 unmanaged files with baseline checksum evidence remained unchanged; uncertain historical assets and hosting metadata were preserved.

This dated review is not permission to delete, and future actions require fresh evidence and separate authorization. No package, new version/tag/release or merge to `main` resulted from convergence. Existing baseline test/dependency caveats remain in the boundary report; focused production build/runtime success does not imply a fully passing broad suite.

Operational authorities: [guided update acceptance](PHASE_7_GUIDED_UPDATE_VERIFICATION.md), [backup/recovery contract](BACKUP_RECOVERY_CONTRACT.md), [read-only cleanup contract](PHASE_8_CLEANUP_VERIFICATION.md), and [disposable failure/retry acceptance](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md). Current instructions are in the [revised guide](GUIA-DO-USUARIO.md) and [technical handover draft](ARCHITECTURE_AND_OPERATIONS_HANDOVER.md); those documentation revisions do not constitute another live verification.
