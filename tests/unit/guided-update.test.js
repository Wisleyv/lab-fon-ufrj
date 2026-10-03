import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createPublishController, getSiteUpdateReadiness } from "../../src/js/editor/publish-service.js";
import { createNativeDesktopHost } from "../../src/js/editor/desktop-host.js";
const require = createRequire(import.meta.url);
const { createGuidedUpdate } = require("../../desktop/guided-update.cjs");
const profile = { host: "fixture", port: 21, username: "editor", secure: true, hasPassword: true };

async function fixture(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-guided-"));
  const history = [];
  let revision = "a".repeat(64);
  let sourceCount = 0;
  let publicCount = 0;
  const transaction = (id, domain, status = "success") => ({ id, revision, snapshots: { [domain]: { status, verifiedAt: "verified" } } });
  const ops = {
    validate: vi.fn(async () => ({ ok: true })),
    revision: vi.fn(async () => revision),
    buildRevision: vi.fn(async () => "b".repeat(64)),
    history: vi.fn(async () => history),
    source: vi.fn(async () => {
      const item = transaction(`source-${++sourceCount}`, "source"); history.unshift(item);
      return { ok: true, recovery: { transactionId: item.id } };
    }),
    verify: vi.fn(async (id, domain) => {
      const item = history.find(item => item.id === id);
      if (!item || item.snapshots[domain]?.status !== "success" || item.snapshots[domain].resolvedAt) throw new Error("Stale remote revision");
    }),
    build: vi.fn(async () => ({ ok: true })),
    publish: vi.fn(async () => {
      const item = transaction(`public-${++publicCount}`, "public"); history.unshift(item);
      return { ok: true, recovery: { transactionId: item.id } };
    }),
    restorePublic: vi.fn(async id => { history.find(item => item.id === id).snapshots.public.resolvedAt = "restored"; }),
  };
  const events = [];
  const run = () => createGuidedUpdate(directory, ops)("fixture-root", profile, "private-password", value => events.push(value));
  try { await callback({ ops, events, history, transaction, run, directory, setRevision: value => { revision = value; } }); }
  finally { await fs.rm(directory, { recursive: true, force: true }); }
}

describe("guided site update", () => {
  it("sequences guarded stages and persists receipts without credentials", async () => fixture(async ({ run, ops, events, directory }) => {
    const result = await run();
    expect(result).toMatchObject({ ok: true, stage: "complete", receipts: { source: { transactionId: "source-1" }, publication: { transactionId: "public-1" } } });
    expect(events.map(item => item.stage)).toEqual(["validation", "validation", "source", "build", "publication", "complete"]);
    const saved = await fs.readFile(path.join(directory, (await fs.readdir(directory))[0]), "utf8");
    expect(saved).not.toContain("private-password");
    expect(saved).not.toContain("username");
    expect(ops.source).toHaveBeenCalledOnce();
    expect(ops.build).toHaveBeenCalledOnce();
    expect(ops.publish).toHaveBeenCalledOnce();
  }));

  it.each(["validation", "source", "build"])("stops at %s failure and never starts publication", async stage => fixture(async ({ run, ops }) => {
    ops[stage === "validation" ? "validate" : stage].mockResolvedValue({ ok: false, message: "Fixture failure" });
    const result = await run();
    expect(result.ok).toBe(false);
    expect(ops.publish).not.toHaveBeenCalled();
    if (stage !== "build") expect(ops.build).not.toHaveBeenCalled();
    if (stage === "build") expect(result.receipts.source).not.toBeNull();
    expect(ops.restorePublic).not.toHaveBeenCalled();
  }));

  it("recovers public failure only, then retries from the same verified source with a fresh build", async () => fixture(async ({ run, ops, history, transaction }) => {
    ops.publish.mockImplementationOnce(async () => {
      history.unshift(transaction("failed-public", "public", "possibly_partial"));
      return { ok: false, recovery: { transactionId: "failed-public" } };
    });
    const failed = await run();
    expect(failed).toMatchObject({ ok: false, receipts: { source: { transactionId: "source-1" }, publication: null } });
    expect(ops.restorePublic).toHaveBeenCalledExactlyOnceWith("failed-public", profile, "private-password");
    expect(await run()).toMatchObject({ ok: true });
    expect(ops.source).toHaveBeenCalledOnce();
    expect(ops.build).toHaveBeenCalledTimes(2);
    expect(ops.verify).toHaveBeenCalledWith("source-1", "source", profile, "private-password");
  }));

  it("keeps interrupted compensation pending across restart and blocks further publication", async () => fixture(async ({ run, ops, history, transaction }) => {
    ops.publish.mockImplementationOnce(async () => {
      history.unshift(transaction("interrupted-public", "public", "mutating"));
      throw new Error("Interrupted");
    });
    ops.restorePublic.mockRejectedValue(new Error("Server offline"));
    expect(await run()).toMatchObject({ ok: false, stage: "recovery" });
    expect(await run()).toMatchObject({ ok: false, stage: "recovery" });
    expect(ops.publish).toHaveBeenCalledOnce();
    ops.restorePublic.mockImplementation(async id => { history.find(item => item.id === id).snapshots.public.resolvedAt = "restored"; });
    expect(await run()).toMatchObject({ ok: true });
    expect(ops.source).toHaveBeenCalledOnce();
  }));

  it("recovers a source success whose receipt was lost during interruption", async () => fixture(async ({ run, ops, directory }) => {
    ops.build.mockResolvedValueOnce({ ok: false });
    await run();
    const file = path.join(directory, (await fs.readdir(directory))[0]);
    const journal = JSON.parse(await fs.readFile(file, "utf8"));
    journal.stage = "source"; journal.receipts.source = null;
    await fs.writeFile(file, JSON.stringify(journal));
    expect(await run()).toMatchObject({ ok: true });
    expect(ops.source).toHaveBeenCalledOnce();
  }));

  it("recognizes a verified publication completed before its receipt was saved", async () => fixture(async ({ run, ops, directory }) => {
    await run();
    const file = path.join(directory, (await fs.readdir(directory))[0]);
    const journal = JSON.parse(await fs.readFile(file, "utf8"));
    journal.stage = "publication"; journal.publicPending = true; journal.receipts.publication = null;
    await fs.writeFile(file, JSON.stringify(journal));
    expect(await run()).toMatchObject({ ok: true });
    expect(ops.publish).toHaveBeenCalledOnce();
    expect(ops.restorePublic).not.toHaveBeenCalled();
  }));

  it("rejects a remote source conflict on retry rather than overwriting it", async () => fixture(async ({ run, ops }) => {
    ops.build.mockResolvedValueOnce({ ok: false });
    await run();
    ops.verify.mockRejectedValue(new Error("Source changed elsewhere"));
    expect(await run()).toMatchObject({ ok: false, receipts: { source: null, build: null, publication: null } });
    expect(ops.source).toHaveBeenCalledOnce();
    expect(ops.publish).not.toHaveBeenCalled();
  }));

  it("does not report an altered local build as current after an already-completed publication", async () => fixture(async ({ run, ops }) => {
    expect((await run()).ok).toBe(true);
    ops.buildRevision.mockResolvedValue("c".repeat(64));
    expect(await run()).toMatchObject({ ok: true, receipts: { build: null } });
    expect(ops.publish).toHaveBeenCalledOnce();
  }));

  it("does not attach old receipts to a newly edited source revision", async () => fixture(async ({ run, ops, setRevision }) => {
    ops.build.mockResolvedValueOnce({ ok: false });
    await run();
    setRevision("c".repeat(64));
    expect(await run()).toMatchObject({ ok: true, receipts: { source: { transactionId: "source-2" } } });
    expect(ops.source).toHaveBeenCalledTimes(2);
  }));

  it.each(["source", "build"])("refuses publication when %s changes during the workflow", async type => fixture(async ({ run, ops, setRevision }) => {
    if (type === "source") ops.build.mockImplementation(async () => { setRevision("c".repeat(64)); return { ok: true }; });
    else ops.buildRevision.mockResolvedValueOnce("b".repeat(64)).mockResolvedValue("c".repeat(64));
    expect(await run()).toMatchObject({ ok: false, receipts: { build: null } });
    expect(ops.publish).not.toHaveBeenCalled();
  }));

  it("blocks duplicate execution and corrupted journals", async () => fixture(async ({ ops, directory, run }) => {
    let finish;
    ops.build.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const coordinator = createGuidedUpdate(directory, ops);
    const first = coordinator("fixture-root", profile, "secret");
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    expect(await coordinator("fixture-root", profile, "secret")).toMatchObject({ ok: false, code: "EDITOR_BUSY" });
    finish({ ok: true }); await first;
    const file = path.join(directory, (await fs.readdir(directory))[0]);
    await fs.writeFile(file, "invalid-json");
    expect(await run()).toMatchObject({ ok: false });
    expect(ops.publish).toHaveBeenCalledOnce();
  }));

  it("reuses clean-project and diagnostic guards and forwards native progress with cleanup", async () => {
    const state = { openedProject: { status: "valid", source: "remote-ftp", path: "fixture" }, build: { status: "idle" }, publish: { profile } };
    expect(getSiteUpdateReadiness({ ...state, contentDirty: true }, profile, "secret").ok).toBe(false);
    expect(getSiteUpdateReadiness({ ...state, diagnostics: [{ severity: "error" }] }, profile, "secret").ok).toBe(false);
    expect(getSiteUpdateReadiness({ ...state, openedProject: { ...state.openedProject, source: "local" } }, profile, "secret").ok).toBe(false);
    const unsubscribe = vi.fn(); let listener;
    const bridge = { onSiteUpdateProgress: callback => { listener = callback; return unsubscribe; }, updateSite: vi.fn(async () => { listener({ stage: "build" }); throw new Error("Failed"); }) };
    const host = createNativeDesktopHost(bridge);
    const controller = createPublishController({ host, getState: () => state });
    const progress = vi.fn();
    await expect(controller.updateSite(profile, "secret", progress)).rejects.toThrow("Failed");
    expect(progress).toHaveBeenCalledWith({ stage: "build" });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
