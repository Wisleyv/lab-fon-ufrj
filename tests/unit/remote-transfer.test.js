import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
const require = createRequire(import.meta.url);
const { runTransferWorkers, openTransferClients, uploadProtectedFiles, createTransferProgress,
  formatTransferProgress } = require("../../desktop/remote-transfer.cjs");
const evidence = bytes => ({ bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });

describe("protected remote transfers", () => {
  it("keeps transfer bookkeeping running if the progress observer closes", () => {
    const progress = createTransferProgress([{}], () => { throw Error("Renderer closed"); });
    try {
      expect(() => { progress.begin("upload", 1); progress.done(); }).not.toThrow();
    } finally { progress.stop(); }
  });
  it("bounds workers to two and drains writes before reporting failure", async () => {
    let active = 0, max = 0, finished = false;
    const visited = [];
    await expect(runTransferWorkers([0, 1, 2, 3], [{}, {}, {}], async item => {
      active++; max = Math.max(max, active); visited.push(item);
      if (item === 0) { active--; throw Error("interrupted"); }
      await new Promise(resolve => setTimeout(resolve, 10));
      active--; finished = true;
    })).rejects.toThrow("interrupted");
    expect(max).toBeLessThanOrEqual(2);
    expect(active).toBe(0);
    expect(finished).toBe(true);
    expect(visited).toEqual([0, 1]);
  });

  it("skips checksum-identical files, prepares each directory once, and joins assets before index", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-transfer-"));
    try {
      const bytes = Buffer.from("current");
      const next = path.join(root, "next"); await fs.writeFile(next, bytes);
      const files = ["assets/a.png", "assets/b.png", "assets/unchanged.png", "index.html"]
        .map(relativePath => ({ relativePath, localPath: next }));
      const snapshot = { verifiedAt: "verified", files: files.map(file => ({ path: file.relativePath,
        before: evidence(Buffer.from(file.relativePath.includes("unchanged") ? "current" : "old")), after: evidence(bytes) })) };
      const calls = [];
      const client = () => ({ ensureDir: async dir => calls.push(["dir", dir]), uploadFrom: async (_local, remote) => {
        await new Promise(resolve => setTimeout(resolve, 5)); calls.push(["upload", remote]);
      } });
      const clients = [client(), client()];
      const events = [], progress = createTransferProgress(clients, event => events.push(event));
      try {
        expect(await uploadProtectedFiles(files, snapshot, clients, "/", progress)).toEqual({ uploadedFiles: 3, unchangedFiles: 1, preparedDirectories: 1 });
        expect(calls.filter(call => call[0] === "dir")).toEqual([["dir", "/assets"]]);
        expect(calls.at(-1)).toEqual(["upload", "/index.html"]);
        expect(calls.some(call => call[1] === "/assets/unchanged.png")).toBe(false);
        expect(progress.metrics()).toMatchObject({ uploadedBytes: 21, transferredBytes: 21, skippedFiles: 1 });
        expect(events.at(-1)).toMatchObject({ activity: "upload", totalFiles: 3, completedFiles: 3 });
        await fs.writeFile(next, "modified");
        await expect(uploadProtectedFiles(files, snapshot, clients, "/")).rejects.toThrow("changed after backup");
        await expect(uploadProtectedFiles(files, { ...snapshot, verifiedAt: null }, clients, "/")).rejects.toThrow("incomplete");
      } finally { progress.stop(); }
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it("does not publish index after a failed asset upload", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-transfer-"));
    try {
      const next = path.join(root, "next"); await fs.writeFile(next, "next");
      const files = ["js/new.js", "index.html"].map(relativePath => ({ relativePath, localPath: next }));
      const snapshot = { verifiedAt: "verified", files: files.map(file => ({ path: file.relativePath, before: null, after: evidence(Buffer.from("next")) })) };
      const calls = [];
      const client = { ensureDir: async () => {}, uploadFrom: async (_local, remote) => { calls.push(remote); throw Error("failed"); } };
      await expect(uploadProtectedFiles(files, snapshot, [client], "/")).rejects.toThrow("failed");
      expect(calls).toEqual(["/js/new.js"]);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it("keeps strict connection settings and falls back to the primary when a second session is refused", async () => {
    const primary = {};
    const extra = { access: vi.fn(async () => { throw Error("session limit"); }), close: vi.fn() };
    const profile = { host: "fixture", port: 2100, username: "editor", secure: true };
    expect(await openTransferClients(primary, profile, "secret", () => extra)).toEqual([primary]);
    expect(extra.access).toHaveBeenCalledWith({ host: "fixture", port: 2100, user: "editor", password: "secret", secure: true });
    expect(extra.close).toHaveBeenCalledOnce();
  });

  it("accounts actual live bytes once and reports inactivity without synthetic progress", () => {
    vi.useFakeTimers();
    let time = 0, callback;
    const client = { trackProgress: fn => { callback = fn; } };
    const events = [];
    const progress = createTransferProgress([client], event => events.push(event), () => time);
    try {
      progress.begin("protection", 2);
      callback({ bytesOverall: 100, type: "download" });
      progress.transferred(client, 100); progress.done();
      progress.done(true);
      expect(progress.metrics()).toMatchObject({ transferredBytes: 100, downloadedBytes: 100, skippedFiles: 1 });
      time = 16000; vi.advanceTimersByTime(1000);
      expect(events.at(-1)).toMatchObject({ completedFiles: 2, stalled: true, bytesPerSecond: null });
      expect(formatTransferProgress(events.at(-1))).toContain("Sem progresso");
      progress.begin("verification", 2);
      callback({ bytesOverall: 140, type: "download" }); progress.done();
      expect(progress.metrics().transferredBytes).toBe(140);
    } finally { progress.stop(); vi.useRealTimers(); }
    expect(callback).toBeUndefined();
  });
});
