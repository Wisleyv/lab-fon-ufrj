/**
 * Unit Tests for Helper Functions
 */

import { describe, it, expect, vi } from "vitest";
import {
  debounce,
  formatDate,
  truncate,
  generateId,
  createElement,
} from "../../src/js/utils/helpers.js";

describe("Helper Functions", () => {
  describe("debounce()", () => {
    it("should delay function execution", async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("should only call function once for multiple rapid calls", async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe("formatDate()", () => {
    it("should format date as Brazilian Portuguese", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDate(date);
      expect(formatted).toContain("janeiro");
      expect(formatted).toContain("2024");
    });

    it("should handle string dates", () => {
      const formatted = formatDate("2024-03-20");
      expect(formatted).toContain("março");
    });
  });

  describe("truncate()", () => {
    it("should truncate long text", () => {
      const text = "a".repeat(200);
      const truncated = truncate(text, 150);
      expect(truncated.length).toBeLessThan(text.length);
      expect(truncated).toContain("...");
    });

    it("should not truncate short text", () => {
      const text = "Short text";
      const truncated = truncate(text, 150);
      expect(truncated).toBe(text);
    });

    it("should use custom suffix", () => {
      const text = "a".repeat(200);
      const truncated = truncate(text, 100, " [more]");
      expect(truncated).toContain("[more]");
    });

    it("should handle empty text", () => {
      expect(truncate("", 100)).toBe("");
      expect(truncate(null, 100)).toBeFalsy();
    });
  });

  describe("generateId()", () => {
    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should use custom prefix", () => {
      const id = generateId("card");
      expect(id).toContain("card-");
    });

    it("should use default prefix", () => {
      const id = generateId();
      expect(id).toContain("id-");
    });
  });

  describe("createElement()", () => {
    it("should create element with tag name", () => {
      const el = createElement("div");
      expect(el.tagName).toBe("DIV");
    });

    it("should set className", () => {
      const el = createElement("div", { className: "test-class" });
      expect(el.className).toBe("test-class");
    });

    it("should set attributes", () => {
      const el = createElement("a", {
        href: "https://example.com",
        target: "_blank",
      });
      expect(el.getAttribute("href")).toBe("https://example.com");
      expect(el.getAttribute("target")).toBe("_blank");
    });

    it("should set text content", () => {
      const el = createElement("p", {}, "Hello World");
      expect(el.textContent).toBe("Hello World");
    });

    it("should append child elements", () => {
      const child1 = createElement("span", {}, "Child 1");
      const child2 = createElement("span", {}, "Child 2");
      const parent = createElement("div", {}, [child1, child2]);
      expect(parent.children.length).toBe(2);
    });

    it("should set dataset attributes", () => {
      const el = createElement("div", {
        dataset: { id: "123", type: "card" },
      });
      expect(el.dataset.id).toBe("123");
      expect(el.dataset.type).toBe("card");
    });
  });
});
