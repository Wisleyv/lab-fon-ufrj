import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const smoke = require("../../scripts/editor-smoke-ftp.cjs");

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("disposable FTP smoke environment", () => {
  it("starts, authenticates, lists, retrieves, and stops without changing the repository", async () => {
    const root = await smoke.provisionSmokeRoot();
    temporaryDirectories.push(root);
    const pageBefore = await fs.readFile(
      path.join(process.cwd(), "content", "page.json"),
      "utf8",
    );
    const { server, port } = await smoke.startDisposableFtpServer(root);
    let verification;

    try {
      verification = await smoke.verifyDisposableFtp({ root, port });
      temporaryDirectories.push(verification.retrievedRoot);

      expect(verification.publicationEntries.map((entry) => entry.name)).toContain(
        "index.html",
      );
      expect(verification.publicationEntries.map((entry) => entry.name)).toContain(
        "labfon-source",
      );
      expect(verification.sourceEntries.map((entry) => entry.name)).toContain(
        "content",
      );
      await expect(
        fs.access(path.join(verification.retrievedRoot, "content", "page.json")),
      ).resolves.toBeUndefined();
    } finally {
      await smoke.stopDisposableFtpServer(server, [
        root,
        verification?.retrievedRoot,
      ].filter(Boolean));
    }

    await expect(fs.access(root)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.readFile(path.join(process.cwd(), "content", "page.json"), "utf8"),
    ).resolves.toBe(pageBefore);
  });
});
