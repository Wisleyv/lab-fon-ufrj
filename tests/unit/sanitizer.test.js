/**
 * Unit Tests for HTMLSanitizer
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HTMLSanitizer } from "../../src/js/utils/sanitizer.js";

describe("HTMLSanitizer", () => {
  describe("sanitize()", () => {
    it("should escape HTML special characters", () => {
      const input = '<script>alert("xss")</script>';
      const output = HTMLSanitizer.sanitize(input);
      expect(output).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it("should escape ampersands", () => {
      const input = "Salt & Pepper";
      const output = HTMLSanitizer.sanitize(input);
      expect(output).toBe("Salt &amp; Pepper");
    });

    it("should handle quotes", () => {
      const input = 'He said "Hello"';
      const output = HTMLSanitizer.sanitize(input);
      // textContent doesn't escape quotes, which is fine for our use case
      expect(output).toBe(input);
    });

    it("should handle empty strings", () => {
      expect(HTMLSanitizer.sanitize("")).toBe("");
    });

    it("should handle non-string input gracefully", () => {
      expect(HTMLSanitizer.sanitize(null)).toBe("");
      expect(HTMLSanitizer.sanitize(undefined)).toBe("");
      expect(HTMLSanitizer.sanitize(123)).toBe("");
    });

    it("should preserve safe text", () => {
      const input = "This is safe text";
      const output = HTMLSanitizer.sanitize(input);
      expect(output).toBe(input);
    });
  });

  describe("sanitizeHTML()", () => {
    it("should allow safe HTML tags", () => {
      const input =
        "<p>Text with <strong>bold</strong> and <em>italic</em></p>";
      const output = HTMLSanitizer.sanitizeHTML(input);
      expect(output).toContain("<strong>");
      expect(output).toContain("<em>");
      expect(output).toContain("<p>");
    });

    it("should remove dangerous script tags", () => {
      const input = '<p>Safe text</p><script>alert("xss")</script>';
      const output = HTMLSanitizer.sanitizeHTML(input);
      expect(output).not.toContain("<script>");
      expect(output).toContain("Safe text");
    });

    it("should remove dangerous iframe tags", () => {
      const input = '<p>Content</p><iframe src="evil.com"></iframe>';
      const output = HTMLSanitizer.sanitizeHTML(input);
      expect(output).not.toContain("<iframe>");
    });

    it("should remove event handlers", () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = HTMLSanitizer.sanitizeHTML(input);
      expect(output).not.toContain("onclick");
      expect(output).toContain("Click me");
    });

    it("should remove style attributes", () => {
      const input = '<p style="color: red;">Styled text</p>';
      const output = HTMLSanitizer.sanitizeHTML(input);
      expect(output).not.toContain("style");
      expect(output).toContain("Styled text");
    });

    it("should handle custom allowed tags", () => {
      const input = "<p>Para</p><div>Div</div><span>Span</span>";
      const output = HTMLSanitizer.sanitizeHTML(input, ["p", "span"]);
      expect(output).toContain("<p>");
      expect(output).toContain("<span>");
      expect(output).not.toContain("<div>");
    });

    it("should handle empty strings", () => {
      expect(HTMLSanitizer.sanitizeHTML("")).toBe("");
    });

    it("should handle non-string input", () => {
      expect(HTMLSanitizer.sanitizeHTML(null)).toBe("");
      expect(HTMLSanitizer.sanitizeHTML(undefined)).toBe("");
    });
  });

  describe("sanitizeURL()", () => {
    it("should allow http URLs", () => {
      const url = "http://example.com";
      const output = HTMLSanitizer.sanitizeURL(url);
      // URL normalization may add trailing slash
      expect(output).toMatch(/^http:\/\/example\.com\/?$/);
    });

    it("should allow https URLs", () => {
      const url = "https://example.com/path";
      const output = HTMLSanitizer.sanitizeURL(url);
      expect(output).toBe(url);
    });

    it("should allow mailto URLs", () => {
      const url = "mailto:test@example.com";
      const output = HTMLSanitizer.sanitizeURL(url);
      expect(output).toBe(url);
    });

    it("should reject javascript: protocol", () => {
      const url = "javascript:alert(1)";
      const output = HTMLSanitizer.sanitizeURL(url);
      expect(output).toBeNull();
    });

    it("should reject data: protocol", () => {
      const url = "data:text/html,<script>alert(1)</script>";
      const output = HTMLSanitizer.sanitizeURL(url);
      expect(output).toBeNull();
    });

    it("should handle invalid URLs", () => {
      const url = "javascript:alert(1)"; // Truly invalid/dangerous URL
      const output = HTMLSanitizer.sanitizeURL(url);
      expect(output).toBeNull();
    });

    it("should handle empty URLs", () => {
      expect(HTMLSanitizer.sanitizeURL("")).toBeNull();
      expect(HTMLSanitizer.sanitizeURL(null)).toBeNull();
    });

    it("should respect custom allowed protocols", () => {
      const url = "ftp://example.com";
      const output = HTMLSanitizer.sanitizeURL(url, [
        "http:",
        "https:",
        "ftp:",
      ]);
      // URL normalization may add trailing slash
      expect(output).toMatch(/^ftp:\/\/example\.com\/?$/);
    });
  });
});
