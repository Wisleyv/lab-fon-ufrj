import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { createRetrievalProgress } = require("../../desktop/retrieval-progress.cjs");

describe("retrieval progress", () => {
  it("separates reused bytes, waits for evidence, and suppresses stalled ETA", () => {
    let time = 0;
    const progress = createRetrievalProgress(10, 20000, () => time);
    expect(progress(0, 2, 5000)).toMatchObject({ percent: 20, bytesPerSecond: null, etaSeconds: null });
    time = 1000;
    expect(progress(1000, 3, 5000).etaSeconds).toBeNull();
    time = 4000;
    expect(progress(4000, 4, 5000)).toMatchObject({ bytesPerSecond: 1000, etaSeconds: 11, percent: 40 });
    time = 7000;
    expect(progress(4000, 4, 5000)).toMatchObject({ bytesPerSecond: null, etaSeconds: null });
    time = 8000;
    expect(progress(15000, 10, 5000)).toMatchObject({ percent: 100, etaSeconds: null });
  });
  it("reports file progress but no ETA when byte totals are unknown", () => {
    let time = 0;
    const progress = createRetrievalProgress(4, null, () => time);
    time = 4000;
    expect(progress(2000, 2)).toMatchObject({ totalBytes: null, percent: 50, bytesPerSecond: 500, etaSeconds: null });
  });
});
