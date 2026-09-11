# Content Update Options - Summary (2026-03-16)

> Historical assessment: the packaged desktop editor now supersedes the Netlify CMS. `public/admin/` was archived under `.sanitization-backup/2026-09-11/public/admin/` on September 11, 2026. See [the sanitization report](SANITIZATION_REPORT_2026-09-11.md) for current structure and restoration guidance.

## Current Project Reality (What Already Exists)

- Content is stored as individual JSON files under content/ and consolidated into a single JSON file by scripts/build-data.js before build.
- The frontend loads the consolidated JSON from public/data.json via JSONAdapter (src/js/adapters/JSONAdapter.js).
- A Git-backed CMS is already wired: Netlify/Decap CMS entry point in public/admin/index.html and schema in public/admin/config.yml.
- The ADR on content management (docs/decisions/001-content-management-strategy.md) documents an offline editor alternative for data.json.

## Best Current Way to Update Content

- Use the existing Netlify/Decap CMS UI to edit the JSON entries in content/.
- The build step consolidates content/ into public/data.json, which the site consumes at runtime.
- This keeps content changes isolated from layout changes and avoids editing public/data.json by hand.

## Keystatic Evaluation (For This Repo)

- Good fit for structured, git-based content (JSON files) like the current content/ layout.
- Not a WYSIWYG tool for arbitrary HTML/CSS or page layout changes.
- Swapping to Keystatic is feasible if desired (editor UI change), but does not address visual layout editing.

## Visual Editing (WYSIWYG) Reality Check

- There is no low-risk, static-only WYSIWYG that edits arbitrary HTML/CSS in-place without tradeoffs.
- Most options require hosting migration, a runtime SDK, or a separate system (WordPress/page builder).

## State of the Art (Practical Summary)

- Content editing: Git-based CMS (Decap/Netlify CMS, Keystatic, Tina, etc.) is standard for static sites.
- Visual editing: typically handled by hosted page builders (Builder.io, Webflow, Framer) or WordPress block editor.
- Hybrid approach: block-based JSON schemas with preview panes can give semi-visual control without true WYSIWYG.

## Recommended Paths (Decision Framing)

1) Keep current CMS for content; do layout changes in code (lowest risk).
2) Add block-based content schemas for limited visual control, still static and safe.
3) Adopt a visual CMS/page builder (higher cost and complexity, but true WYSIWYG).
4) Move to WordPress as source of truth (requires deployment model change).

## Relevant Files

- public/admin/index.html (CMS entry point)
- public/admin/config.yml (CMS collections and fields)
- scripts/build-data.js (content consolidation)
- public/data.json (runtime data output)
- src/js/adapters/JSONAdapter.js (data loading)
- docs/decisions/001-content-management-strategy.md (ADR)
