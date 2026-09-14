import { expect, it, vi } from "vitest";
import { initHeaderScroll } from "../../src/js/header-scroll.js";
import fs from "node:fs";
import { applySiteContent } from "../../src/js/site-content.js";

it("keeps one semantic header with adjacent identity and existing navigation controls", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const header = parsed.querySelector(".site-header");
  document.body.replaceChildren(document.importNode(header, true));
  const site = JSON.parse(fs.readFileSync("content/site.json", "utf8"));
  applySiteContent(document, site);
  const layout = document.querySelector(".header-content");
  expect([...layout.children].map((node) => node.className)).toEqual(["logo", "logo-text", "main-nav"]);
  expect(document.querySelectorAll("header, h1")).toHaveLength(2);
  expect(document.querySelector("h1").textContent).toBe(site.header.title);
  expect(document.querySelector(".subtitle").textContent).toBe(site.header.subtitle);
  expect(document.querySelector("a.logo").getAttribute("href")).toBe("#top");
  expect(document.querySelector(".logo-image").alt).toBe(site.header.logo.alt);
  const toggle = document.querySelector(".nav-toggle");
  expect(document.getElementById(toggle.getAttribute("aria-controls"))).not.toBeNull();
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(document.querySelector(".has-dropdown > a").getAttribute("aria-haspopup")).toBe("true");
});
it("measures responsive anchor clearance and uses the expanded height for hysteresis with cleanup", () => {
  document.body.innerHTML = '<header class="site-header"></header>';
  const header = document.querySelector("header");
  header.getBoundingClientRect = () => ({ height: 156 });
  let resize, scroll, frame;
  const disconnect = vi.fn();
  const win = { scrollY: 24, ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() { disconnect(); } },
    addEventListener: vi.fn((_name, fn) => { scroll = fn; }), removeEventListener: vi.fn(), requestAnimationFrame: vi.fn((fn) => { frame = fn; return 1; }), cancelAnimationFrame: vi.fn() };
  const dispose = initHeaderScroll(document, win);
  expect(win.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
  expect(header.classList.contains("is-scrolled")).toBe(false);
  expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("156px");
  win.scrollY = 181; scroll(); scroll();
  expect(win.requestAnimationFrame).toHaveBeenCalledTimes(1);
  frame();
  expect(header.classList.contains("is-scrolled")).toBe(true);
  header.getBoundingClientRect = () => ({ height: 100 }); resize();
  expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("100px");
  dispose(); expect(disconnect).toHaveBeenCalledOnce();
  expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("");
});
it("does not toggle again when header resizing shifts the scroll position near either boundary", () => {
  document.body.innerHTML = '<header class="site-header"></header>';
  const header = document.querySelector("header");
  header.getBoundingClientRect = () => ({ height: header.classList.contains("is-scrolled") ? 128 : 194 });
  const toggle = vi.spyOn(header.classList, "toggle");
  let scroll, frame;
  const win = { scrollY: 0, addEventListener: (_name, fn) => { scroll = fn; }, removeEventListener: vi.fn(),
    requestAnimationFrame: (fn) => { frame = fn; return 1; }, cancelAnimationFrame: vi.fn() };
  const dispose = initHeaderScroll(document, win);
  const move = (y) => { win.scrollY = y; scroll(); frame(); };
  toggle.mockClear();
  for (const y of [23, 25, 180, 218]) move(y);
  expect(toggle).not.toHaveBeenCalled();
  move(219);
  expect(toggle).toHaveBeenCalledExactlyOnceWith("is-scrolled", true);
  // Simulate anchoring after contraction, then small scroll reversals.
  for (const y of [153, 217, 219, 30, 25, 26]) move(y);
  expect(toggle).toHaveBeenCalledTimes(1);
  move(24);
  expect(toggle).toHaveBeenLastCalledWith("is-scrolled", false);
  for (const y of [90, 25, 23, 100, 218]) move(y);
  expect(toggle).toHaveBeenCalledTimes(2);
  dispose();
});

it("initializes compact on a restored deep scroll and updates clearance without ResizeObserver", () => {
  document.body.innerHTML = '<header class="site-header"></header>';
  const header = document.querySelector("header");
  header.getBoundingClientRect = () => ({ height: header.classList.contains("is-scrolled") ? 128 : 194 });
  const win = { scrollY: 500, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const dispose = initHeaderScroll(document, win);
  expect(header.classList.contains("is-scrolled")).toBe(true);
  expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("128px");
  dispose();
});
it("enlarges at the top, compacts after scrolling and restores at the top", () => {
  document.body.innerHTML = '<header class="site-header"></header>';
  let listener;
  const win = { scrollY: 0, addEventListener: (_name, fn) => { listener = fn; }, removeEventListener: vi.fn(), requestAnimationFrame: vi.fn(), cancelAnimationFrame: vi.fn() };
  const dispose = initHeaderScroll(document, win);
  const header = document.querySelector("header");
  expect(header.classList.contains("is-scrolled")).toBe(false);
  win.requestAnimationFrame.mockImplementation((callback) => { callback(); return null; });
  win.scrollY = 100; listener();
  expect(header.classList.contains("is-scrolled")).toBe(true);
  win.scrollY = 0; listener();
  expect(header.classList.contains("is-scrolled")).toBe(false);
  dispose(); expect(win.removeEventListener).toHaveBeenCalled();
});
