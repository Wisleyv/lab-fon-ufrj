const fs = require("node:fs/promises");
const path = require("node:path");
const { scanLocal, createCleanupManifest } = require("../desktop/remote-cleanup.cjs");
const { listEditableProjectBundleFiles, listDistFiles, validateGeneratedSite, isPublicArtifact } = require("../desktop/main.cjs");
const { isSourceFile } = require("../desktop/source-manifest.cjs");
const { fileEvidence } = require("../desktop/remote-cleanup.cjs");

async function main() {
  const mirror = process.argv[2];
  const output = process.argv[3];
  if (!mirror || !output) throw new Error("Usage: node scripts/propose-remote-cleanup.cjs <read-only mirror> <report.json>");
  const root = process.cwd();
  if (!(await validateGeneratedSite(root)).ok) throw new Error("Build a valid current public site first");
  const inventory = await scanLocal(path.resolve(mirror));
  const evidence = {
    sourceFiles: await fileEvidence(await listEditableProjectBundleFiles(root)),
    publicFiles: await fileEvidence(await listDistFiles(root)),
    connectionKey: "offline-mirror-not-live-FTP",
  };
  const manifest = createCleanupManifest(inventory, evidence);
  const simulated = new Map(inventory.map(file => [file.path, file]));
  for (const [prefix, files] of [["source/", evidence.sourceFiles], ["", evidence.publicFiles]]) {
    for (const file of files) simulated.set(`${prefix}${file.path}`, { ...file, path: `${prefix}${file.path}`, type: "file" });
  }
  const updatedPlan = createCleanupManifest([...simulated.values()].sort((a, b) => a.path.localeCompare(b.path)), evidence);
  for (const file of updatedPlan.proposed) simulated.delete(file.path);
  const survivingBoundaryExceptions = [...simulated.keys()].filter(name => !name.split("/").some(part => part.startsWith(".")) &&
    !(name.startsWith("source/") ? isSourceFile(name.slice(7)) : isPublicArtifact(name)));
  const deferred = manifest.retained.filter(file => /deferred-until-guided-update/.test(file.classification));
  const report = {
    evidence: "Read-only C:/tmp/backup mirror; not current-server evidence or authorization",
    manifest,
    deferredProposedAfterGuidedUpdate: deferred,
    deferredBytes: deferred.reduce((sum, file) => sum + file.bytes, 0),
    approvedAssetRemovals: [],
    simulationOnlyAfterVerifiedGuidedUpdate: {
      sourceCurrent: updatedPlan.sourceCurrent, publicCurrent: updatedPlan.publicCurrent,
      removedPaths: updatedPlan.proposed.map(file => file.path), removedBytes: updatedPlan.proposedBytes,
      survivingBoundaryExceptions,
      note: "In-memory inventory overlay only; neither the mirror nor production was changed",
    },
  };
  await fs.writeFile(path.resolve(output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ files: inventory.length, sourceCurrent: manifest.sourceCurrent, publicCurrent: manifest.publicCurrent,
    proposed: manifest.proposed.length, proposedBytes: manifest.proposedBytes, deferred: deferred.length, deferredBytes: report.deferredBytes }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
