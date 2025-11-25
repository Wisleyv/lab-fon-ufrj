<!-- Copilot Instructions for Lab-FON-UFRJ -->
# Lab-FON-UFRJ — AI Coding Assistant Notes

This short guide gives an AI coding agent the essentials to be productive in this repository.

- **Project Type**: Small vanilla JavaScript website (Vite) using an Adapter + Renderer architecture.
- **Primary entry**: `src/js/main.js` — initializes app, loads data and renders sections.
- **Data source**: `public/data.json` (served by Vite). `src/js/adapters/JSONAdapter.js` normalizes/validates it.

**Architecture & Patterns**
- **Adapter Pattern**: Data adapters live in `src/js/adapters/`. Implement `DataAdapter` subclasses with `fetch()`, `normalize()` and `validate()`.
  - Example: `JSONAdapter` retries fetch, normalizes data and accepts legacy shapes (`equipe` or `pesquisadores`).
- **Section Renderer (Template Method)**: `src/js/modules/renderer.js` contains `SectionRenderer`.
  - Subclasses must implement `template(data)` and can override `afterRender()`.
  - Typical subclass: `src/js/sections/pesquisadores.js` (uses `createElement`, groups by category, supports view modes).
- **Utilities**: `src/js/utils/sanitizer.js` exposes `HTMLSanitizer.sanitize`, `sanitizeHTML`, and `sanitizeURL` — always use these before inserting user/content strings into `innerHTML`.

**Key files and concrete examples**
- `src/js/main.js`: shows app bootstrap, how adapters are instantiated, and how section renderers are registered and used.
- `src/js/adapters/JSONAdapter.js`: demonstrates fetch/retry/timeout pattern and data validation rules (look for `equipe` or legacy properties).
- `src/js/sections/pesquisadores.js`: example of a renderer subclass — check `template()`, `afterRender()`, `createMemberCard()` for accessibility patterns.

**Build, Test & Run (developer workflows)**
- Install & dev server: `npm install` then `npm run dev` (serves at `http://localhost:3000`).
- Production build: `npm run build` (Vite config sets `base` to `/labfonac/` and `build.outDir` to `C:/labfonac`). Keep this in mind when changing asset paths.
- Tests: `npm test` runs Vitest in watch mode. For CI-style single runs use `npm test -- --run` or `npm run test:coverage`.

**Project-specific conventions and gotchas**
- File casing: JS uses camelCase for filenames, CSS uses kebab-case; classes are PascalCase.
- Vite is configured for Windows/OneDrive: `server.watch.usePolling = true` and `strictPort = true`. Avoid changing these without testing on Windows.
- The app writes build output directly to `C:/labfonac` — avoid changing `vite.config.js` `build.outDir` unless you understand deployment implications.
- `index.html` and `vite.config.js` assume `base: '/labfonac/'` — relative URLs expect that base path on production.
- Debug hooks: `window.__APP__` is set in `main.js` for runtime inspection; use it for quick debugging.

**How to add a new section**
1. Create `src/js/sections/YourSection.js` extending `SectionRenderer`.
2. Implement `template(data)` to return a string/HTMLElement/DocumentFragment and override `afterRender()` if needed.
3. Register the section in `src/js/main.js` and call `render()` with the appropriate slice of the normalized data.
4. Add unit tests under `tests/unit/` verifying `template()` output and sanitizer usage.

**Testing expectations**
- Unit tests live under `tests/unit/` and use Vitest with `jsdom` environment.
- Prefer testing behavior (DOM structure, sanitizer output) rather than exact string matches for full HTML blobs.

**Integration points & external deps**
- Future WordPress integration should implement a `WordPressAdapter` under `src/js/adapters/` and match `DataAdapter` interface.
- Deployment currently expects manual upload of `C:/labfonac` to the server (see `package.json` `deploy:build`).

**Safety & accessibility**
- Use `HTMLSanitizer` for any external or content-origin strings.
- Follow the patterns in `pesquisadores.js` for ARIA usage and live regions (`aria-live-region`, `aria-atomic`, etc.).

**If you change data shape**
- Update `src/js/adapters/JSONAdapter.js` to normalize legacy/modern shapes and adjust `validate()` accordingly so sections don't break at runtime.

**Non-obvious commands**
- Run dev server on staging-like mode (uses same config): `npm run dev` (Vite handles modes via `--mode` if needed).
- Build for staging: `npm run build:staging` (uses `--mode staging`).

If anything here is unclear or you want extra examples (e.g., a new `SectionRenderer` skeleton or a sample unit test for a renderer), tell me which part to expand and I will update this file.
