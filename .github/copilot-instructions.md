# Copilot instructions for Lab-FON-UFRJ

## Project context
- This repository is a static, vanilla JavaScript + Vite website for the UFRJ phonetics lab.
- Main app bootstrap lives in [src/js/main.js](../src/js/main.js); content is rendered from normalized data.
- The canonical data source is [public/data.json](../public/data.json), loaded through [src/js/adapters/JSONAdapter.js](../src/js/adapters/JSONAdapter.js).
- The production environment is shared static hosting with FTP-only deployment; do not introduce a backend or server-side runtime unless the project owner explicitly changes that constraint.

## Architecture to preserve
- Maintain the static-first, adapter + renderer architecture.
- Keep data access in adapter classes under [src/js/adapters](../src/js/adapters); do not access data sources directly from renderers.
- Keep section renderers under [src/js/sections](../src/js/sections) and extend [src/js/modules/renderer.js](../src/js/modules/renderer.js). Implement `template(data)` and use `afterRender()` only when needed.
- Keep content separate from presentation: do not hard-code institutional content into renderers when it belongs in the data model.
- Prefer `createElement`, small DOM fragments, and sanitizer utilities instead of raw HTML injection when content is user-controlled.
- Always sanitize content that comes from external or editorial data before injecting with `innerHTML` or similar; use the helpers in [src/js/utils/sanitizer.js](../src/js/utils/sanitizer.js).

## Development workflow
- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Run tests once: `npm test -- --run`
- Open Vitest UI: `npm run test:ui`
- Build production bundle: `npm run build`
- Build staging bundle: `npm run build:staging`
- Lint: `npm run lint`

## Repository conventions
- JavaScript files use camelCase; classes use PascalCase; CSS uses kebab-case.
- Keep Vite deployment assumptions intact: `base` is set for `/labfonac/`, and production output may be written to `C:/labfonac` when needed. Avoid changing these unless the deployment requirement is verified.
- Windows/OneDrive watchers are intentionally configured in [vite.config.js](../vite.config.js); do not change polling or port strictness without checking the dev workflow.
- If the data shape changes, update the adapter normalization/validation path before changing section logic so renderers do not break at runtime.
- Tests use Vitest + jsdom; prefer behavior assertions over brittle full-HTML snapshots.

## Change discipline and safety
- Favor small, incremental, reversible changes.
- Prefer extending existing abstractions rather than creating competing patterns.
- Do not bypass the adapter layer without justification.
- Do not introduce dependencies or infrastructure solely for trendiness; prefer maintainability and static hosting compatibility.
- Do not add authentication, backend services, or database logic unless explicitly required.
- Keep deployment credentials outside the repository.

## Accessibility and security requirements
- Accessibility is a core requirement; maintain semantic HTML, keyboard support, focus states, contrast, proper headings, and ARIA usage.
- Ensure uploaded or editorial content is sanitized and safe before rendering.
- Do not treat accessibility as a later optimization.
- Keep the site static and suitable for long-term institutional maintenance.

## When adding a section or adapter
1. Add the adapter or renderer in the matching folder under [src/js/adapters](../src/js/adapters) or [src/js/sections](../src/js/sections).
2. Route the new section through [src/js/main.js](../src/js/main.js) and pass the correct normalized slice of the dataset.
3. Keep accessibility patterns consistent with the existing renderers and sanitizer utilities.
4. Add or update tests under [tests](../tests) to cover expected behavior.

## Validation expectations
- Before considering a meaningful change complete, run the relevant tests and verify the build still succeeds.
- Check for regressions and keep the project compatible with static hosting.
- Every feature or component with meaningful logic should have appropriate tests.

## Helpful references
- [AGENTS.md](../AGENTS.md)
- [README.md](../README.md)
- [WALKING_SKELETON_README.md](../WALKING_SKELETON_README.md)
- [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)
- [src/js/utils/sanitizer.js](../src/js/utils/sanitizer.js)
- [src/js/sections/pesquisadores.js](../src/js/sections/pesquisadores.js)

Keep the project architecture stable and prefer small, validated changes that fit the existing adapter + renderer model.
