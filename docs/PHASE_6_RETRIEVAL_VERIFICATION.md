# Phase 6: retrieval and progress

Implemented in the post-v1 worktree, preserving accepted Phases 1-5. No commit or push.

## Identity and fallback

- Discovery retains nonnegative integer LIST sizes and caches directory listings.
- Reuse is limited to existing `public/assets/` and `src/assets/images/` files.
- The server must advertise HASH with SHA-256 and accept its selection. Only a full-file SHA-256 response with the exact requested path is accepted; ranged responses must cover bytes 0 through size minus 1.
- Local size and SHA-256 must match. The copied staging file is hashed again before reuse is accepted. Files resolving outside the active workspace are not reused.
- Changed, absent, unsupported, malformed, or uncertain identities download normally. Content and application files always download. Size/time alone never authorize reuse.
- Exactly two sequential FTP download workers remain. Staging, project validation, and local activation are unchanged. No remote checksum manifest is uploaded.

## Progress

- Connection, discovery, local verification, download, and project validation have distinct status messages.
- Percentage measures completed files (including verified reuse), not estimated bytes. Known byte totals and actual received bytes are shown separately.
- Aggregate rate uses an eight-second sampling window with a three-second warmup. Rate and ETA disappear after three seconds without movement.
- ETA estimates remaining download time only; unknown byte totals suppress ETA. Project validation remains a separate phase after 100% file completion.
- Retrieval metrics distinguish reused files/bytes, downloaded source bytes, reuse time, and other stage times. Downloaded bytes exclude preliminary validation probes and FTP protocol overhead.

## Verification

- 90 tests passed across retrieval, progress, Editor bootstrap, build, and publication suites.
- Cases cover unchanged assets, equal-size remote/local changes, unsupported checksums, malformed/partial/wrong-path responses, unknown sizes, stalls, two-worker accounting, and preservation of the active workspace on failure.
- Editor renderer and public production builds passed. Final `dist` is public-only. Asset audit remained byte-identical.
- Local fixture repeat retrieval reused two assets (418 bytes); this proves transfer avoidance, not a production speed improvement. No real FTP access was performed.

## Phase 7 limitations

- Servers without usable SHA-256 HASH support still download all files. Supporting those servers efficiently would require a separately authorized trusted remote identity manifest or equivalent strategy.
- FTP supplies no snapshot lock: another maintainer must not modify the source during retrieval. This pre-existing concurrent-edit limitation remains.
- Backup/publication transfer costs and semantics are unchanged. This phase does not implement guided publication or remote cleanup.
