import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { createRecoveryStore } = require("../../desktop/recovery-store.cjs");
const { uploadProtectedFiles, createTransferProgress } = require("../../desktop/remote-transfer.cjs");
const profile = { host: "example.edu", port: 21, username: "editor", secure: true, password: "never record this" };

async function fixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfonac-recovery-"));
  const remote = path.join(root, "remote");
  const backups = path.join(root, "backups");
  const local = target => path.join(remote, target.replace(/^\/+/, ""));
  const write = async (target, bytes) => {
    await fs.mkdir(path.dirname(local(target)), { recursive: true });
    await fs.writeFile(local(target), bytes);
  };
  await write("/index.html", "previous site");
  await write("/source/content/site.json", "previous source");
  await write("/source/.htaccess", "deny");
  await write("/.ftpquota", "quota");
  const calls = [];
  let failDownload = false, failUpload = false;
  const client = {
    async list(target) {
      const entries = await fs.readdir(local(target), { withFileTypes: true });
      return Promise.all(entries.map(async entry => ({ name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory(),
        size: entry.isFile() ? (await fs.stat(path.join(local(target), entry.name))).size : 0 })));
    },
    async downloadTo(stream, target) {
      if (failDownload) throw Error("capture interrupted");
      stream.end(await fs.readFile(local(target)));
    },
    async ensureDir(target) { await fs.mkdir(local(target), { recursive: true }); },
    async uploadFrom(source, target) {
      calls.push(["upload", target]);
      if (failUpload) throw Error("restore interrupted");
      await write(target, await fs.readFile(source));
    },
    async remove(target) { calls.push(["remove", target]); await fs.unlink(local(target)); },
  };
  const next = path.join(root, "next.txt");
  await fs.writeFile(next, "new content");
  const store = createRecoveryStore(backups, { keepSuccessful: 1 });
  try { await callback({ root, backups, local, write, client, calls, next, store,
    failCapture: () => { failDownload = true; }, failRestore: () => { failUpload = true; } }); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

describe("transaction-scoped recovery", () => {
  it("drains a second backup worker before persisting failed capture and never authorizes mutation", async () => {
    await fixture(async ({ store, client, next, write, backups, calls }) => {
      await write("/assets/a.bin", "before");
      let drained = false;
      const secondary = { ...client, downloadTo: async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        await client.downloadTo(...args); drained = true;
      } };
      const primary = { ...client, downloadTo: async () => { throw Error("capture interrupted"); } };
      await expect(store.prepare(primary, "public", profile, [
        { relativePath: "assets/a.bin", localPath: next }, { relativePath: "index.html", localPath: next },
      ], "workers", { clients: [primary, secondary] })).rejects.toThrow("interrupted");
      expect(drained).toBe(true);
      const [transaction] = await store.list(profile);
      expect(transaction.snapshots.public).toMatchObject({ status: "backup_failed", verifiedAt: null });
      expect(transaction.snapshots.public.files.map(file => file.path)).toEqual(["index.html"]);
      expect(await fs.readFile(path.join(backups, transaction.id, "public/files/index.html"), "utf8")).toBe("previous site");
      expect(calls).toEqual([]);
    });
  });
  it.each([false, true])("backs up the full manifest and avoids unchanged uploads (server HASH=%s)", async hashSupported => {
    await fixture(async ({ store, client, next, write, local }) => {
      const old = Buffer.alloc(32768, 1), changed = Buffer.alloc(32768, 2);
      await fs.writeFile(next, changed);
      const unchangedLocal = path.join(path.dirname(next), "unchanged"); await fs.writeFile(unchangedLocal, old);
      const files = Array.from({ length: 64 }, (_, index) => ({ relativePath: `assets/file-${index}.bin`, localPath: index ? unchangedLocal : next }));
      for (const file of files) await write(`/${file.relativePath}`, old);
      let downloads = 0, hashes = 0, uploads = 0, directories = 0;
      const download = client.downloadTo, upload = client.uploadFrom, ensure = client.ensureDir;
      client.downloadTo = async (...args) => { downloads++; await download(...args); };
      client.uploadFrom = async (...args) => { uploads++; await upload(...args); };
      client.ensureDir = async (...args) => { directories++; await ensure(...args); };
      if (hashSupported) {
        client.features = async () => new Map([["HASH", "SHA-256*"]]);
        client.send = async command => {
          if (command === "OPTS HASH SHA-256") return { code: 200 };
          hashes++;
          const remote = command.slice(5), bytes = await fs.readFile(local(remote));
          return { code: 213, message: `213 SHA-256 0-${bytes.length - 1} ${createHash("sha256").update(bytes).digest("hex")} ${remote}` };
        };
      }
      const progress = createTransferProgress([client]);
      try {
        const transaction = await store.prepare(client, "public", profile, files, "representative", { progress });
        expect((await store.verify(transaction.id, "public")).snapshots.public.files).toHaveLength(64);
        expect(uploads).toBe(0); // No mutation before all backup bytes are verified.
        await store.mark(transaction, "public", "mutating");
        const transfer = await uploadProtectedFiles(files, transaction.snapshots.public, [client], "/", progress);
        await store.verifyRemote(client, transaction, "public", { progress });
        await store.mark(transaction, "public", "success");
        expect(transfer).toEqual({ uploadedFiles: 1, unchangedFiles: 63, preparedDirectories: 1 });
        expect(uploads).toBe(1); expect(directories).toBe(1);
        expect(downloads).toBe(hashSupported ? 1 : 128);
        expect(progress.metrics().transferredBytes).toBe((hashSupported ? 2 : 129) * old.length);
        console.log("Representative 64-file update", JSON.stringify({ hashSupported,
          before: { downloads: 128, uploads: 64, ensureDir: 64, bytes: 192 * old.length },
          after: { downloads, uploads, ensureDir: directories, hashes, bytes: progress.metrics().transferredBytes } }));
        await store.restore(client, transaction.id, "public", profile);
        expect(await fs.readFile(local("/assets/file-0.bin"))).toEqual(old);
      } finally { progress.stop(); }
    });
  });

  it("rejects equal-size remote conflicts with fresh HASH evidence, falling back on malformed responses", async () => {
    await fixture(async ({ store, client, next, write, local }) => {
      let malformed = true;
      client.features = async () => new Map([["HASH", "SHA-256"]]);
      client.send = async command => {
        if (command.startsWith("OPTS")) return { code: 200 };
        const remote = command.slice(5), bytes = await fs.readFile(local(remote));
        return { code: 213, message: `213 SHA-256 ${createHash("sha256").update(bytes).digest("hex")} ${malformed ? "/wrong-path" : remote}` };
      };
      const transaction = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], "hash");
      await write("/index.html", "new content");
      await store.verifyRemote(client, transaction, "public");
      malformed = false;
      await write("/index.html", "bad content");
      await expect(store.verifyRemote(client, transaction, "public")).rejects.toThrow("checksum");
    });
  });

  it("links separate source/public snapshots and restores public failure without rolling back successful source", async () => {
    await fixture(async ({ store, client, next, write, local, backups }) => {
      const source = await store.prepare(client, "source", profile, [{ relativePath: "content/site.json", localPath: next }], "revision");
      await store.mark(source, "source", "mutating");
      await client.uploadFrom(next, "/source/content/site.json");
      await store.verifyRemote(client, source, "source");
      await store.mark(source, "source", "success");
      const publication = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }, { relativePath: "js/new.js", localPath: next }], "revision");
      expect(publication.id).toBe(source.id);
      await store.mark(publication, "public", "mutating");
      await write("/index.html", "incomplete transfer");
      await write("/js/new.js", "new content");
      await store.mark(publication, "public", "possibly_partial");
      await store.restore(client, publication.id, "public", profile);
      expect(await fs.readFile(local("/index.html"), "utf8")).toBe("previous site");
      await expect(fs.access(local("/js/new.js"))).rejects.toThrow();
      expect(await fs.readFile(local("/source/content/site.json"), "utf8")).toBe("new content");
      expect(await fs.readFile(local("/source/.htaccess"), "utf8")).toBe("deny");
      expect(await fs.readFile(local("/.ftpquota"), "utf8")).toBe("quota");
      const persisted = await fs.readFile(path.join(backups, publication.id, "transaction.json"), "utf8");
      expect(persisted).not.toContain(profile.password);
      expect(JSON.parse(persisted).snapshots.source.status).toBe("success");
    });
  });

  it("blocks mutations when capture fails and keeps incomplete evidence", async () => {
    await fixture(async ({ store, client, next, calls, failCapture }) => {
      failCapture();
      await expect(store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], "revision")).rejects.toThrow();
      const [transaction] = await store.list(profile);
      expect(transaction.snapshots.public.status).toBe("backup_failed");
      expect(transaction.snapshots.public.verifiedAt).toBeNull();
      expect(calls).toEqual([]);
    });
  });

  it("keeps the original recovery target through a failed retry and covers newly attempted files", async () => {
    await fixture(async ({ store, client, next, write, local }) => {
      const first = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], "revision");
      await store.mark(first, "public", "mutating");
      await write("/index.html", "partial first attempt");
      await store.mark(first, "public", "possibly_partial");
      const retry = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next },
        { relativePath: "js/retry.js", localPath: next }], "revision");
      expect(retry.snapshots.public.recoveryTargetId).toBe(first.id);
      await write("/index.html", "partial retry");
      await write("/js/retry.js", "new content");
      await store.mark(retry, "public", "possibly_partial");
      await store.restore(client, retry.id, "public", profile);
      expect(await fs.readFile(local("/index.html"), "utf8")).toBe("previous site");
      await expect(fs.access(local("/js/retry.js"))).rejects.toThrow();
      const recovered = await store.list(profile);
      expect(recovered.find(transaction => transaction.id === first.id).snapshots.public.resolvedAt).toBeTruthy();
      expect(recovered.find(transaction => transaction.id === retry.id).snapshots.public.resolvedAt).toBeTruthy();
    });
  });

  it("refuses a damaged backup or different server before restoring", async () => {
    await fixture(async ({ store, client, next, backups, calls }) => {
      const transaction = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], "revision");
      await expect(store.restore(client, transaction.id, "public", { ...profile, host: "another.edu" })).rejects.toThrow("another connection");
      await fs.writeFile(path.join(backups, transaction.id, "public/files/index.html"), "damaged");
      await expect(store.restore(client, transaction.id, "public", profile)).rejects.toThrow("checksum");
      expect(calls).toEqual([]);
    });
  });

  it("restores explicit source deletions and verifies bytes rather than equal length", async () => {
    await fixture(async ({ store, client, local, write }) => {
      const transaction = await store.prepare(client, "source", profile, [{ relativePath: "content/site.json", localPath: null }], "deletion");
      await store.mark(transaction, "source", "mutating");
      await client.remove("/source/content/site.json");
      await store.verifyRemote(client, transaction, "source");
      await store.mark(transaction, "source", "success");
      await store.restore(client, transaction.id, "source", profile);
      expect(await fs.readFile(local("/source/content/site.json"), "utf8")).toBe("previous source");
      const changed = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: path.join(local("/source"), "content/site.json") }], "changed");
      await write("/index.html", "x".repeat("previous source".length));
      await expect(store.verifyRemote(client, changed, "public")).rejects.toThrow("checksum");
    });
  });

  it("preserves a second verified snapshot if restoration itself fails", async () => {
    await fixture(async ({ store, client, next, write, failRestore }) => {
      const transaction = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], "revision");
      await write("/index.html", "failed publication");
      failRestore();
      await expect(store.restore(client, transaction.id, "public", profile)).rejects.toThrow("interrupted");
      const transactions = await store.list(profile);
      expect(transactions).toHaveLength(2);
      const undo = transactions.find(item => item.id !== transaction.id);
      expect(undo.snapshots.public.status).toBe("possibly_partial");
      expect((await store.verify(undo.id, "public")).snapshots.public.files[0].before.bytes).toBe("failed publication".length);
    });
  });

  it("prunes only surplus successful transactions and preserves failed, interrupted and damaged records", async () => {
    await fixture(async ({ store, client, next, backups }) => {
      const transactions = [];
      for (let index = 0; index < 4; index++) {
        const transaction = await store.prepare(client, "public", profile, [{ relativePath: "index.html", localPath: next }], `revision-${index}`);
        await store.mark(transaction, "public", index < 2 ? "success" : index === 2 ? "possibly_partial" : "mutating");
        transactions.push(transaction);
      }
      await fs.mkdir(path.join(backups, "damaged-record"));
      await store.prune();
      expect(await store.list()).toHaveLength(3);
      await fs.access(path.join(backups, "damaged-record"));
      await fs.access(path.join(backups, transactions[2].id));
      await fs.access(path.join(backups, transactions[3].id));
    });
  });

  it("rejects recovery paths outside the selected domain", async () => {
    await fixture(async ({ store, client, next, calls }) => {
      for (const relativePath of ["../escape", "source/content/site.json", ".ftpquota", "C:/escape"]) {
        await expect(store.prepare(client, "public", profile, [{ relativePath, localPath: next }], "invalid")).rejects.toThrow();
      }
      expect(calls).toEqual([]);
    });
  });
});
