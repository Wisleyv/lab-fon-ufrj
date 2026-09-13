import { describe, expect, it } from "vitest";
import { createEditorStore, getBusyReadiness } from "../../src/js/editor/state.js";
import { getGeneratedPreviewReadiness } from "../../src/js/editor/build-service.js";
import { getSourceUpdateReadiness } from "../../src/js/editor/publish-service.js";

const profile = { host: "ftp.example.edu", port: 21, username: "editor", hasPassword: true, remoteSourcePath: "/source", remotePublishPath: "/" };
function readyStore() {
  const store = createEditorStore();
  store.setState({ openedProject: { path: "C:/project", status: "valid" }, publish: { profile, status: "ready" } });
  store.setState({ build: { status: "success", previewUrl: "http://localhost/old" }, receipts: { source: { revision: 1 }, build: { revision: 1 }, publication: { revision: 1 } } });
  return store;
}

describe("editor session readiness and receipts", () => {
  it.each(["contentDirty", "compositionDirty"])("invalidates receipts and generated preview after %s, including a later save", (key) => {
    const store = readyStore();
    store.setState({ [key]: true });
    expect(store.getState().build).toMatchObject({ status: "stale", previewUrl: null });
    expect(store.getState().receipts).toEqual({ source: null, build: null, publication: null });
    store.setState({ [key]: false });
    expect(getGeneratedPreviewReadiness(store.getState()).ok).toBe(false);
    expect(getSourceUpdateReadiness(store.getState(), profile).ok).toBe(true);
  });

  it("invalidates an existing build when replacing a project", () => {
    const store = readyStore();
    store.setState({ openedProject: { path: "C:/other", status: "valid" } });
    expect(store.getState().build.status).toBe("idle");
    expect(store.getState().receipts.source).toBeNull();
  });

  it("invalidates remote receipts on destination changes without invalidating the local build", () => {
    const store = readyStore();
    store.setState({ publish: { status: "configured", profile: { ...profile, host: "other.example.edu" } } });
    expect(store.getState().receipts).toEqual({ source: null, publication: null, build: { revision: 1 } });
    expect(store.getState().build.status).toBe("success");
  });

  it("invalidates publication on a new build but preserves a current source update", () => {
    const store = readyStore();
    store.setState({ build: { status: "running" } });
    expect(store.getState().receipts).toEqual({ source: { revision: 1 }, publication: null, build: null });
  });

  it("does not restore session success receipts from an earlier session", () => {
    const previous = readyStore().getState();
    const store = createEditorStore(previous);
    expect(store.getState().receipts).toEqual({ source: null, publication: null, build: null });
    store.reset(previous);
    expect(store.getState().receipts.source).toBeNull();
  });

  it.each(["contentLoading", "contentSaving", "compositionSaving", "projectOpening", "profileSaving", "previewOpening"])("blocks conflicting operations during %s", (key) => {
    const store = readyStore();
    store.setState({ [key]: true });
    expect(getBusyReadiness(store.getState()).code).toBe("EDITOR_BUSY");
    expect(getSourceUpdateReadiness(store.getState(), profile).ok).toBe(false);
  });
});
