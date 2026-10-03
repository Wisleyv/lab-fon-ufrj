# Asset Reference Audit

Run `node scripts/audit-assets.js` from the project root for a read-only JSON report.
To save the generated report, use `node scripts/audit-assets.js --output docs/ASSET_REFERENCE_AUDIT.json`.
Only the explicitly requested documentation report is written; content, assets and remote files are never changed.

The audit reuses Phase 2's `isSourceFile` boundary. Canonical JSON is authoritative, including disabled sections. Generated `public/data.json` and `dist`, Editor files and repository documentation are not reference sources.

Fixed references come from public `index.html`, CSS URLs and complete quoted asset literals in admitted website JavaScript. The actual favicon, Lattes button and team-placeholder paths are thus derived from the existing public source rather than duplicated in an asset allowlist. SVG/CSS dependencies reachable from retained assets are also retained.

Each retained asset lists the source file, JSON field or reference type, original URL and reason. Leading `/assets/`, relative `assets/` and `/labfonac/assets/` URLs resolve to `public/assets/`. Query strings, fragments and encoded filenames are handled. Unsafe paths are invalid; references outside the managed boundary are unresolved. External URLs are listed without network access.

Exact duplicate groups require matching length, SHA-256 and byte-for-byte comparison. They overlap the retained/candidate categories. Their redundant-byte totals are not additive cleanup savings: two byte-identical assets may both have authoritative references.

Unreferenced media are review candidates. Unreferenced non-media files, unreadable input, symbolic links and ambiguous references remain unresolved. Computed JavaScript URLs and historical uses cannot be proven by static literals; review them before any cleanup. Missing/invalid references also block using this report as an automatic deletion list.

This is a local checkout audit, not proof of remote equality. The mirrored inventory's source/public image duplication is architectural; matching names or rounded sizes in that inventory do not prove byte identity. A later approved operation must verify remote identity and recovery before cleanup. Phase 3 performs neither operation.

## Local checkpoint results

The generated `ASSET_REFERENCE_AUDIT.json` records 100 assets (75,895,436 bytes), with:

- 46 retained assets: 53,029,547 bytes, including five fixed assets (42,894 bytes);
- 53 unreferenced media candidates: 22,862,090 bytes;
- one unresolved non-media asset: `public/assets/images/README.md` (3,799 bytes);
- one exact duplicate group, with 123,235 redundant bytes;
- zero missing or invalid references.

The duplicate paths are `image-2e612c11-bae1-4178-9cd3-ba542b3cfef9.jpg` and `image-721ec0b0-b35c-4878-8c93-53bed2f2a141.jpg` under `public/assets/images/`. Both have canonical references; deleting either would break a referenced path. Any future deduplication requires a separately approved content migration and recovery support.

These measurements describe this checkout. The earlier mirrored inventory has different file totals; no claim of remote equivalence is made.
