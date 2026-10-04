const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { formatTransferProgress } = require("./remote-transfer.cjs");

function createGuidedUpdate(directory, operations) {
  let busy = false;
  const messages = {
    validation: "Verificando projeto e conexão...",
    source: "Protegendo e atualizando projeto remoto...",
    build: "Gerando e verificando site...",
    publication: "Protegendo e publicando site...",
    recovery: "Recuperando site anterior...",
    complete: "Site atualizado.",
  };
  return async function run(root, profile, password, onProgress = () => {}) {
    if (busy) return { ok: false, code: "EDITOR_BUSY", message: "Aguarde a operação em andamento." };
    busy = true;
    let journal;
    let filename;
    const save = async () => {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(`${filename}.tmp`, `${JSON.stringify(journal, null, 2)}\n`);
      await fs.rename(`${filename}.tmp`, filename);
    };
    const stage = async value => {
      journal.stage = value;
      await save();
      onProgress({ stage: value, message: messages[value], receipts: journal.receipts });
    };
    const result = (ok, code, message) => ({ ok, code, message, stage: journal?.stage || "validation", receipts: journal?.receipts || {} });
    const transferProgress = progress => onProgress({ ...progress, stage: journal?.stage,
      receipts: journal?.receipts, message: formatTransferProgress(progress) });
    const unchanged = async () => {
      if (await operations.revision(root) !== journal.revision) {
        journal.receipts = { source: null, build: null, publication: null };
        await save();
        throw new Error("Projeto alterado durante a atualização. Gere uma nova atualização.");
      }
    };
    const verifyReceipt = async (id, domain) => {
      try { await operations.verify(id, domain, profile, password, transferProgress); }
      catch (error) {
        journal.receipts.publication = null;
        if (domain === "source") { journal.receipts.source = null; journal.receipts.build = null; }
        await save();
        throw error;
      }
    };
    // A process can stop after the remote operation but before its receipt is saved.
    const reconcilePublication = async () => {
      if (!journal.publicPending) return;
      const history = await operations.history(profile);
      const transaction = history.find(item => item.revision === journal.revision && !item.restoreOf && item.snapshots.public?.verifiedAt);
      if (transaction && !transaction.snapshots.public.resolvedAt) {
        if (transaction.snapshots.public.status === "success") {
          await verifyReceipt(transaction.id, "public");
          journal.receipts.publication = { transactionId: transaction.id };
        } else if (["mutating", "possibly_partial"].includes(transaction.snapshots.public.status)) {
          await stage("recovery");
          await operations.restorePublic(transaction.id, profile, password, transferProgress);
          journal.receipts.publication = null;
        }
      }
      journal.publicPending = false;
      await save();
    };
    try {
      onProgress({ stage: "validation", message: messages.validation });
      const validation = await operations.validate(root, profile, password);
      if (!validation.ok) return validation;
      const key = createHash("sha256").update(JSON.stringify([root, profile.host, profile.port, profile.username, profile.secure])).digest("hex");
      filename = path.join(directory, `${key}.json`);
      try {
        journal = JSON.parse(await fs.readFile(filename, "utf8"));
        if (journal.version !== 1 || !journal.receipts || !/^[a-f0-9]{64}$/.test(journal.revision)) throw new Error("Registro de atualização inválido.");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (journal) await reconcilePublication();
      const revision = await operations.revision(root);
      if (!journal || journal.revision !== revision) {
        journal = { version: 1, revision, stage: "validation", publicPending: false, receipts: { source: null, build: null, publication: null } };
      }
      await stage("validation");
      const history = await operations.history(profile);
      const source = history.find(item => item.revision === revision && !item.restoreOf && item.snapshots.source?.status === "success" && !item.snapshots.source.resolvedAt);
      if (journal.receipts.source || source) {
        const id = journal.receipts.source?.transactionId || source.id;
        await verifyReceipt(id, "source");
        journal.receipts.source = { transactionId: id };
        await save();
      } else {
        await stage("source");
        await unchanged();
        const updated = await operations.source(root, profile, password, transferProgress);
        if (!updated?.ok || !updated.recovery?.transactionId) return result(false, updated?.code || "UPDATE_SOURCE_FAILED", updated?.message || "Projeto remoto não atualizado. Site anterior preservado.");
        journal.receipts.source = { transactionId: updated.recovery.transactionId };
        await save();
      }
      await unchanged();
      if (journal.receipts.publication) {
        await verifyReceipt(journal.receipts.publication.transactionId, "public");
        try {
          if (await operations.buildRevision(root) !== journal.receipts.build?.fingerprint) journal.receipts.build = null;
        } catch { journal.receipts.build = null; }
        await stage("complete");
        return result(true, "SITE_UPDATED", messages.complete);
      }
      // Rebuild on every publication retry; never trust a pre-existing dist directory.
      journal.receipts.build = null;
      await stage("build");
      const built = await operations.build(root);
      if (!built?.ok) return result(false, built?.code || "UPDATE_BUILD_FAILED", "Projeto remoto atualizado. Geração não concluída; site anterior preservado.");
      await unchanged();
      const buildHash = await operations.buildRevision(root);
      journal.receipts.build = { fingerprint: buildHash };
      await save();
      await verifyReceipt(journal.receipts.source.transactionId, "source");
      await unchanged();
      if (await operations.buildRevision(root) !== buildHash) {
        journal.receipts.build = null;
        await save();
        throw new Error("Site gerado alterado. Publicação cancelada.");
      }
      journal.publicPending = true;
      await stage("publication");
      const published = await operations.publish(root, profile, password, transferProgress);
      if (!published?.ok || !published.recovery?.transactionId) {
        await reconcilePublication();
        return result(false, published?.code || "UPDATE_PUBLICATION_FAILED", "Projeto remoto atualizado. Publicação não concluída; site anterior preservado ou recuperado. Tente atualizar novamente.");
      }
      journal.receipts.publication = { transactionId: published.recovery.transactionId };
      journal.publicPending = false;
      await stage("complete");
      return result(true, "SITE_UPDATED", messages.complete);
    } catch {
      if (journal?.publicPending && journal.stage !== "recovery") {
        try { await reconcilePublication(); }
        catch { /* Keep recovery pending; never compensate the canonical source. */ }
      }
      // A failed compensation or interrupted publication must remain explicitly pending.
      return result(false, "SITE_UPDATE_INTERRUPTED", journal?.publicPending
        ? "Projeto remoto preservado. Site pode estar parcial; recuperação pendente. Tente atualizar novamente ou recuperar a versão anterior."
        : "Atualização interrompida. Estado remoto não confirmado; tente atualizar novamente.");
    } finally { busy = false; }
  };
}

module.exports = { createGuidedUpdate };
