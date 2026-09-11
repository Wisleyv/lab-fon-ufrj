# GPT-6 Astra follow-up — Production readiness, real content editing, packaging, and controlled deployment

Resume from the current Lab-FON project state and work only toward production readiness.

Read first:

```text
docs/Follow-up-prompt.md
docs/DEVELOPMENT_LOG.md
AGENTS.md
```

Treat the latest September 2026 handoff as authoritative over older historical plans.

## Current authoritative state

```text
remoteSourcePath  = /source/
remotePublishPath = /
public URL        = https://posvernaculas.letras.ufrj.br/labfonac/
```

Current remote editorial state:

```text
Publicações → disabled
Extensão    → enabled
Egressos    → present
PROVALE     → nested under Extensão
```

Already verified:

- real FTPS connectivity;
- remote `/source/` initialization;
- remote retrieval into the app-managed workspace;
- constrained remote-source update;
- fresh retrieval after update;
- build from retrieved workspace;
- generated preview under `/labfonac/`;
- packaged Electron launch and native bridge interaction;
- generated preview hides Publicações and the stale `#trabalhos` hero action.

Important Electron facts:

```text
ELECTRON_RUN_AS_NODE=1
```

was process-local to the previous agent environment, not user or machine scope.

When launching Electron from an agent process, clear that variable for the child process.

Packaged desktop builds must use:

```text
LABFON_EDITOR_BUILD=true
```

Do not revisit FTP/TLS/server mapping, source initialization, or Electron diagnosis unless a new concrete regression appears.

---

# Primary goal

Move the project from “infrastructure proven” to **production-ready maintainer workflow**.

This run should answer, with actual tests rather than assumptions:

1. Can a maintainer edit real structured site data through the packaged editor?
2. Can the editor add/edit/remove records from the JSON-backed content sets where those operations make sense?
3. Can the editor enable/add sections, remove/disable them, reorder existing sections, and place newly enabled sections at the desired position?
4. Does the complete real-world remote workflow succeed?
5. Can a stable production Windows editor package be created?
6. Can the generated site be safely published to production?
7. Are there any remaining launch blockers?
8. Can the requested logo top/scroll behavior be added without disturbing the layout?

Do not spend this run on features that are not necessary to answer those questions.

---

# 1. Start with a concise production-readiness inventory

Before editing code, inspect only the files needed to answer:

- which JSON datasets are currently editable;
- which editor screens/services manage them;
- which datasets are singleton objects versus multi-item collections;
- which composition controls already exist;
- how the header/logo currently reacts to scroll;
- which existing package command/configuration produces the Windows editor.

Give a short pre-edit note containing:

```text
JSON datasets found
existing CRUD support
existing section-composition support
logo/header mechanism found
packaging command to use
files likely to change
genuine blockers, if any
```

Do not produce another broad architecture review.

---

# 2. Preserve the product model

The ordinary maintainer workflow remains:

```text
connect
→ retrieve /source/
→ edit
→ save locally
→ update /source/
→ retrieve fresh
→ build
→ preview
→ publish dist/ to /
```

Keep these operations distinct:

```text
Salvar
→ local app-managed workspace

Atualizar projeto remoto
→ /source/

Publicar site
→ /
```

Never make local save silently imply remote source synchronization.

Never make remote source synchronization silently imply publication.

---

# 3. Actual data-editing acceptance test

Use the packaged editor and the real retrieved `/source/` project.

Perform at least one controlled edit to real user-facing structured content through the normal editor UI.

Choose a low-risk field already represented in the editor.

Do not invent permanent academic content merely for testing.

If no intended permanent content change is available, use a clearly temporary edit, verify the complete round trip, and restore the original value before final production publication.

The acceptance path must be:

```text
retrieve real /source/
→ edit structured content through UI
→ preview
→ save locally
→ update /source/
→ retrieve fresh
→ verify edited value persisted
→ build
→ preview
```

Do not replace this with direct JSON editing from the terminal.

---

# 4. JSON dataset capability audit

Inspect the current production-relevant structured content under `content/`.

Build a concise capability matrix such as:

```text
dataset             edit     add     remove     notes
site singleton      yes      n/a     n/a        ...
equipe collection   yes      yes     yes        ...
linhas collection   ...      ...     ...        ...
parcerias            ...      ...     ...        ...
extensão             ...      ...     ...        ...
```

Use the actual project datasets and actual UI behavior; do not assume the examples above are exhaustive.

For singleton configuration/content files, `add/remove` may correctly be `n/a`.

For collection datasets, verify add/edit/remove using the editor UI.

Use representative operations, not dozens of redundant records.

---

# 5. Implement only missing production-critical CRUD

If a currently used production content set cannot be maintained through the editor, implement only the minimum UI/service support required for:

```text
list
add
edit
remove
validate
save
```

where those operations make sense.

Reuse existing loaders, validation, host bridge, forms, and content schemas.

Keep JSON as storage, not as the ordinary maintainer interface.

Do not add:

- a generic JSON editor;
- a schema-builder;
- a new CMS;
- a database;
- arbitrary file editing;
- bulk import/export unless already present and required.

If completing CRUD for every historical/disabled dataset would materially expand the task, prioritize datasets used by the current live composition and report the non-live gap as a follow-up instead of derailing production readiness.

---

# 6. Section-composition acceptance

Verify the editor can perform all of the following through its normal UI:

```text
enable/add a registered section
disable/remove an active section
move an existing section up
move an existing section down
place a newly enabled section at the intended position
persist the order
retrieve fresh and preserve the order
```

Use the existing controlled section registry/composition model.

Do not implement arbitrary HTML/CSS sections.

Do not build a generic page builder.

Drag-and-drop is not required.

If the current move-up/move-down controls plus insertion behavior are clear and sufficient, keep them.

If placement of a newly enabled section is genuinely awkward or impossible, add the smallest clear control needed, such as:

```text
insert before
insert after
```

or an explicit position selector.

Do not redesign the composition UI for aesthetics.

---

# 7. Protect the current editorial state

The desired production composition remains:

```text
Publicações → disabled
Extensão    → enabled
Egressos    → present
PROVALE     → nested under Extensão
```

Temporary composition changes used for testing must be restored before final publication unless they are intentional production changes.

Navigation must always reflect the final active composition.

No top-level PROVALE navigation item should appear.

---

# 8. Add the requested logo behavior

Implement only this visual change:

- while the page is at or near the top, show the Lab logo larger;
- after the user scrolls down, restore it to the normal compact header size;
- when the user returns to the top, enlarge it again.

Inspect the existing sticky-header/scroll behavior first.

Prefer reusing an existing scroll-state class.

If no such state exists, add the smallest possible scroll-state mechanism.

Prefer:

```text
CSS size/transform transition
+
one existing/minimal header state class
```

Avoid repeated DOM work on every scroll event.

Requirements:

- responsive on desktop and mobile;
- no obvious layout jump;
- navigation remains usable;
- logo does not overlap content;
- respect existing reduced-motion behavior if present;
- do not redesign the header.

Use restrained values consistent with the current design.

---

# 9. Real-world packaged-editor test

After any required fixes, use the packaged application as a maintainer would.

Required real-world sequence:

```text
launch packaged editor
→ connect using saved real FTPS profile
→ browse/select /source/
→ retrieve
→ edit content
→ exercise representative CRUD
→ exercise section composition
→ preview
→ save locally
→ update /source/
→ retrieve fresh
→ confirm persistence
→ generate site
→ preview generated site at /labfonac/
```

This must use the app-managed retrieved workspace, not the development repository as a substitute.

Do not claim success based solely on unit tests.

---

# 10. Production-readiness audit — blockers only

After the real-world test, inspect only launch-relevant issues:

```text
data loss/corruption
local save failure
remote-source update failure
wrong remote path
publication-root/source confusion
build failure
preview failure
broken navigation
missing/broken assets
data.json loading failure
visible stale/disabled links
runtime/console errors
obvious desktop/mobile layout breakage
accessibility regression introduced by final changes
```

Classify findings as:

```text
BLOCKER
IMPORTANT FOLLOW-UP
NICE-TO-HAVE
```

Fix:

```text
BLOCKER
```

and only small, low-risk `IMPORTANT FOLLOW-UP` items that directly improve production readiness.

Do not implement `NICE-TO-HAVE` items in this run.

Do not refactor unrelated code while auditing.

---

# 11. Testing discipline

Run tests in proportion to actual changes.

If code changes:

1. run directly relevant tests first;
2. fix concrete regressions;
3. run the full existing suite once near the end;
4. run the production web build once;
5. package Electron once after the final source state.

Do not repeatedly run the full suite after every small edit.

Do not create new test infrastructure.

Add focused regression coverage only for concrete defects or newly added production-critical CRUD/composition behavior.

---

# 12. Stable production packaging

Create a stable Windows production artifact using the existing Electron Builder configuration.

Required environment:

```text
LABFON_EDITOR_BUILD=true
```

If the known OneDrive `release/win-unpacked` lock occurs, use the already established stable non-OneDrive release location.

Prefer a durable release destination such as:

```text
C:\labfon-editor-release\
```

rather than `%TEMP%`.

Do not add, unless already configured and immediately necessary:

```text
code signing
auto-update
new installer framework
telemetry
crash reporting
cloud distribution
```

Produce the normal existing production artifact(s) and report exact paths.

Verify the packaged executable actually launches.

---

# 13. Production publication is authorized only after all gates pass

This run MAY publish the site to the real FTP publication root:

```text
/
```

but only after the production-readiness gates below pass.

Use the existing constrained publication service.

Upload only the generated static site output.

Do not upload the development repository.

Do not upload `/source/` as publication output.

Do not delete the remote tree first.

Preserve:

```text
/source/
.ftpquota
```

and any hosting metadata not owned by the generated build.

Keep the existing safe-publication behavior:

```text
generated files first
critical verification
index.html last
```

If the publication service already implements a slightly different verified safe order, reuse it rather than redesigning it.

---

# 14. Production gates

Do not publish until all applicable checks are green:

```text
✓ packaged editor launches
✓ real /source/ retrieval succeeds
✓ real structured-content edit succeeds
✓ local save succeeds
✓ remote-source update succeeds
✓ fresh retrieval proves persistence
✓ required JSON collection add/edit/remove works
✓ singleton editing works where appropriate
✓ section enable/disable/reorder/placement works
✓ retrieved project builds
✓ generated preview is correct
✓ final composition is correct
✓ logo top/scroll behavior is correct
✓ no production BLOCKER remains
✓ stable Windows editor artifact exists
```

If any gate fails:

```text
STOP BEFORE PUBLICATION
```

Report the blocker.

Do not weaken the gate to finish the run.

---

# 15. Live deployment verification

If all gates pass, publish the generated site to:

```text
FTP /
```

Then verify:

```text
https://posvernaculas.letras.ufrj.br/labfonac/
```

Check at minimum:

- page exits loader/loads fully;
- HTML corresponds to the new build;
- CSS and JS assets load;
- `data.json` loads;
- Publicações is not visible;
- Extensão is visible;
- PROVALE appears under Extensão;
- Egressos remains present;
- navigation matches active sections;
- no stale `#trabalhos` action is visible;
- logo is larger at the top;
- logo returns to compact size on scroll;
- no obvious console/runtime error;
- one desktop and one narrow/mobile smoke check.

Do not perform unrelated visual polishing after a successful launch.

---

# 16. Source/public integrity after publication

After publication, confirm:

```text
/source/
```

still contains the canonical editable project.

Confirm the publication operation did not overwrite or delete `/source/`.

Confirm a fresh editor retrieval of `/source/` still validates.

Do not perform another editorial cycle unless required to correct a launch blocker.

---

# 17. Update documentation at the end

Update `docs/DEVELOPMENT_LOG.md` with one concise new session handoff containing:

```text
what was tested
CRUD capability matrix summary
section-composition result
logo change
production defects fixed
package artifact path
publication result
live-site verification
remaining blockers/follow-ups
next exact action
```

Do not rewrite historical sessions.

Update the footer/status so it reflects the current 2026 production-readiness phase rather than the old 2025 backend-planning status.

Also update `docs/Follow-up-prompt.md` only if a genuinely new handoff constraint must persist into the next run.

Do not grow the follow-up prompt with obsolete troubleshooting history.

---

# Explicit non-goals for this run

Do NOT introduce:

- WordPress;
- Netlify CMS;
- GitHub CMS;
- a database;
- a backend API;
- a new authentication system;
- a new FTP/SFTP architecture;
- a generic page builder;
- arbitrary raw JSON editing;
- drag-and-drop merely for polish;
- image-management infrastructure unless a launch blocker proves it necessary;
- auto-update;
- code signing;
- telemetry;
- broad refactors;
- speculative abstractions;
- additional test frameworks.

Historical log entries mentioning those older approaches are historical only.

---

# Completion criteria

This run is complete when either:

## Production-ready and deployed

```text
✓ real data editing tested
✓ JSON CRUD capability verified
✓ required missing CRUD fixed
✓ section composition verified
✓ real-world packaged workflow passed
✓ requested logo behavior implemented
✓ blocker-only audit completed
✓ stable editor package produced
✓ production site published
✓ live site verified
✓ /source/ preserved
✓ development log updated
```

or:

## Correctly blocked

```text
✓ exact production blocker identified
✓ no unsafe publication performed
✓ smallest next action documented
```

Then stop.

---

# Before acting

Give only a concise plan containing:

- datasets to test;
- representative real edit to use;
- CRUD operations to exercise;
- section-composition operations to exercise;
- logo implementation approach;
- packaging target;
- publication gate;
- files likely to change;
- any genuine blocker.

Do not provide another broad architecture assessment.

---

# Final report

Report only:

- actual structured-data edit result;
- JSON CRUD matrix;
- section add/remove/reorder/placement result;
- real-world packaged workflow result;
- logo top/scroll behavior result;
- production blockers found/fixed;
- important follow-ups not implemented;
- nice-to-have items deferred;
- files materially changed;
- tests run and results;
- production build result;
- stable Windows package path;
- packaged executable launch result;
- remote `/source/` integrity result;
- production publication result;
- live `/labfonac/` verification result;
- `DEVELOPMENT_LOG.md` update result;
- exact next action.

Then stop.

Do not begin another feature-development cycle after production readiness is established.
