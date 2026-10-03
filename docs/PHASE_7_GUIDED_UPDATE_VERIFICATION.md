# Phase 7: guided site update

Dated implementation/verification record. The pending manual/production statements below are historical: see [disposable acceptance](DISPOSABLE_FTP_ACCEPTANCE_REPORT.md) and [accepted production convergence](PRODUCTION_CONVERGENCE_2026-10-03.md). The implemented workflow remains the reference for the [current guide](GUIA-DO-USUARIO.md).

Implemented in `C:\Temp\labfonac-post-v1.0` on the existing post-v1 branch, preserving Phases 1-6. No commit or push.

## Maintainer workflow

Retrieve the remote project, edit and explicitly save, optionally review locally, then confirm **Atualizar site**. A pre-existing build or a separate manual connection test is not required: the workflow performs its own checks.

The normal publication panel uses the existing `editor-publish-site` control for the guided action. The former source-only control is hidden and disabled; its lower-level service/native operations remain available for composition and regression tests. Local initialization and explicit recovery are unchanged.

## Internal stages and receipts

1. Existing clean-project, busy, diagnostic, profile and desktop guards.
2. Native local-project validation and existing read-only FTP destination test.
3. Source backup, update and checksum verification through the existing operation, or remote verification of a matching successful source receipt.
4. A fresh production build and a fingerprint of its output; source identity checked again.
5. Remote source receipt verification and another local source/build identity check.
6. Public backup, publication and checksum verification through the existing operation.
7. Persisted completion receipts and final status.

The coordinator stores an atomically replaced journal under Electron user data `publish/guided-updates/`. Its filename binds the workspace and connection; its revision is the positive portable-source fingerprint. It stores stages and backup transaction IDs, not passwords or connection credentials. Recovery manifests remain the authoritative evidence of remote operations.

## Failure, interruption and retry

- Failed source update prevents build/publication; existing source backup and explicit recovery remain available. No source rollback is added.
- Successful source update stays authoritative if build/publication fails. Build failure leaves the public site untouched.
- Within the explicitly confirmed guided action, a partial public failure triggers a bounded recovery of the previous public mutation set using the existing verified restore operation. This never restores `/source/`.
- Failed public recovery remains durably pending. A user-triggered retry must resolve it before another publication. There is no background retry.
- After interruption, the coordinator reconciles the journal with existing recovery transactions. A verified completed source is not uploaded again; a verified completed publication is not repeated. Incomplete publication is recovered first.
- A publication retry rebuilds rather than trusting an existing `dist`. Source conflicts, changed local revisions and modified generated output prevent publication. Invalidated receipts are cleared rather than presented as current.
- Public-only explicit recovery retains source evidence; existing source recovery closes the working project and requires retrieval again.

Stage messages use the existing publish status/state path and a polite live region. Controls remain busy-guarded across tabs. An old generated preview is invalidated on entry. Failed outcomes expose **Tentar atualizar novamente** without claiming success.

## Verification

- 151 distinct focused tests passed across guided update, Editor bootstrap/state/publish/build, native retrieval/publication and recovery-store suites.
- Native integration fixtures run real local production builds and filesystem-backed FTP. A failure at public `index.html` restored the original public index/data while retaining edited source; retry published without another source upload.
- Tests cover failed validation/source/build, publication compensation, failed compensation across restart, missing receipts after interruption, completed publication before journal receipt, source conflict, changed source/build, duplicate invocation, malformed journal, dirty/diagnostic/local-project guards and progress listener cleanup.
- Editor renderer and public production builds passed; final `dist` remains public-only. No dependency or packaging change was made in this phase.

## Remaining Limits

FTP is not atomic and provides no cross-maintainer lock. A public tree can be temporarily partial during transfer; an outage can prevent compensation until the connection returns. Local verified backups and pending recovery state are retained, never advertised as proof of a successful restoration.

Exclusive maintenance access remains required. Manual Electron acceptance is still pending. Production was not accessed or mutated. Phase 8 cleanup and orphan handling remain unauthorized.
