import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { auditAssets } from "../../scripts/audit-assets.js";

async function fixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfonac-audit-"));
  const write = async (file, text) => {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  };
  await write("index.html", '<link rel="icon" href="/assets/images/icon.svg">');
  await write("public/assets/images/icon.svg", '<svg><image href="dependency.png"/></svg>');
  await write("public/assets/images/dependency.png", "dependency");
  try { await callback(root, write); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

describe("non-destructive asset audit", () => {
  it("retains canonical, fixed, srcset and transitive assets while proving duplicates and deterministic output", async () => {
    await fixture(async (root, write) => {
      await write("content/site.json", JSON.stringify({ header: { logo: { srcset: "/assets/images/photo.png 1x, /assets/images/retina.png 2x" } } }));
      await write("content/disabled.json", JSON.stringify({ enabled: false, image: { src: "assets/images/disabled.png" } }));
      await write("public/assets/images/photo.png", "same bytes");
      await write("public/assets/images/duplicate.png", "same bytes");
      await write("public/assets/images/retina.png", "retina");
      await write("public/assets/images/disabled.png", "disabled");
      await write("public/assets/images/README.md", "historical notes");
      await write("src/js/sections/team-photo.js", 'export const fallback = "assets/images/fallback.svg";');
      await write("public/assets/images/fallback.svg", "<svg/>");
      await write("src/js/editor/main.js", 'const ignored = "assets/images/duplicate.png";');
      await write("public/data.json", JSON.stringify({ logo: "assets/images/duplicate.png" }));
      const report = await auditAssets(root);
      expect(await auditAssets(root)).toEqual(report);
      expect(report.retained.map(asset => asset.path)).toEqual([
        "public/assets/images/dependency.png", "public/assets/images/disabled.png",
        "public/assets/images/fallback.svg", "public/assets/images/icon.svg",
        "public/assets/images/photo.png", "public/assets/images/retina.png",
      ]);
      expect(report.candidates.map(asset => asset.path)).toEqual(["public/assets/images/duplicate.png"]);
      expect(report.duplicates).toHaveLength(1);
      expect(report.duplicates[0].redundantBytes).toBe(10);
      expect(report.summary.unresolvedAssets.count).toBe(1);
      expect(report.summary.missing).toBe(0);
      expect(await fs.readFile(path.join(root, "public/assets/images/duplicate.png"), "utf8")).toBe("same bytes");
    });
  });

  it("reports missing, invalid, external and ambiguous references without trusting generated data", async () => {
    await fixture(async (root, write) => {
      await write("content/person.json", JSON.stringify({ foto: "assets/images/missing.png", logo: "assets/images/%2e%2e/secret.png", image: { src: "file:///C:/photo.png" }, source: "https://example.com/image.png", fallback: "images/legacy.png", srcset: "assets/images/missing.png nonsense" }));
      await write("content/broken.json", "{broken");
      await write("src/js/main.js", 'const prefix = "assets/images/";');
      const report = await auditAssets(root);
      expect(report.summary.missing).toBe(1);
      expect(report.summary.invalid).toBe(3);
      expect(report.external).toHaveLength(1);
      expect(report.unresolved.map(item => item.reason)).toContain("invalid canonical JSON");
      expect(report.unresolved.map(item => item.reason)).toContain("asset path outside managed source boundary");
      expect(report.unresolved.map(item => item.reason)).toContain("asset directory or computed path prefix");
    });
  });
});
