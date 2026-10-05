import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { createLocalCleanup } = require("../../desktop/local-cleanup.cjs");
async function fixture(callback) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-local-cleanup-"));
  const root = path.join(base, "project"), storage = path.join(base, "backups");
  const relative = "public/assets/images/old.png", local = path.join(root, relative), id = "a".repeat(64);
  await fs.mkdir(path.dirname(local), { recursive: true });
  const bytes = Buffer.from("old photo"); await fs.writeFile(local, bytes);
  const files = [{ path: relative, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }];
  try { await callback({ root, storage, relative, local, id, files, service: createLocalCleanup(root, storage) }); }
  finally { await fs.rm(base, { recursive: true, force: true }); }
}
describe("local cleanup recovery", () => {
  it("copies and verifies before removing, then restores exact bytes", async () => fixture(async ({ service, files, id, local }) => {
    await service.prepare(files, id); await service.validateCurrent(id); await service.remove(id);
    await expect(fs.readFile(local)).rejects.toMatchObject({ code: "ENOENT" });
    await service.restore(id); expect(await fs.readFile(local, "utf8")).toBe("old photo");
    await service.restore(id); expect(await fs.readFile(local, "utf8")).toBe("old photo");
  }));
  it.each(["changed", "damaged"])("refuses %s evidence without deleting", async mode => fixture(async ({ service, files, id, local, storage, relative }) => {
    await service.prepare(files, id);
    if (mode === "changed") await fs.writeFile(local, "new photo");
    else await fs.writeFile(path.join(storage, id, "files", relative), "damaged");
    await expect(service.remove(id)).rejects.toThrow(); expect(await fs.readFile(local, "utf8")).toBe(mode === "changed" ? "new photo" : "old photo");
  }));
  it("never overwrites a new file during recovery", async () => fixture(async ({ service, files, id, local }) => {
    await service.prepare(files, id); await service.remove(id); await fs.writeFile(local, "new photo");
    await expect(service.restore(id)).rejects.toThrow(); expect(await fs.readFile(local, "utf8")).toBe("new photo");
  }));
  it("rejects escape paths and linked image folders", async () => fixture(async ({ service, files, id, root, local }) => {
    await expect(service.prepare([{ ...files[0], path: "public/assets/images/../../secret.png" }], id)).rejects.toThrow("Unsafe");
    const outside = path.join(path.dirname(root), "outside"); await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, "old.png"), "old photo");
    await fs.rm(path.dirname(local), { recursive: true });
    await fs.symlink(outside, path.dirname(local), "junction");
    await expect(service.prepare(files, id)).rejects.toThrow("Linked");
    expect(await fs.readFile(path.join(outside, "old.png"), "utf8")).toBe("old photo");
  }));
});
