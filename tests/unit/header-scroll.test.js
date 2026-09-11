import { expect, it, vi } from "vitest";
import { initHeaderScroll } from "../../src/js/header-scroll.js";
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
