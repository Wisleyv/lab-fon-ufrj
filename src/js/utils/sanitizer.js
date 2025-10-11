/**
 * HTML Sanitization Utilities
 * Protects against XSS attacks by escaping or filtering HTML content
 */

export class HTMLSanitizer {
  /**
   * Escapes all HTML special characters
   * @param {string} str - String to sanitize
   * @returns {string} Escaped string safe for innerHTML
   * @example
   * HTMLSanitizer.sanitize('<script>alert("xss")</script>')
   * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;'
   */
  static sanitize(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Sanitizes HTML allowing only safe tags
   * @param {string} html - HTML to sanitize
   * @param {string[]} allowedTags - Array of allowed tag names
   * @returns {string} Sanitized HTML
   * @example
   * HTMLSanitizer.sanitizeHTML('<p>Text with <strong>bold</strong> and <script>bad</script></p>')
   * // Returns: '<p>Text with <strong>bold</strong> and </p>'
   */
  static sanitizeHTML(html, allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span']) {
    if (typeof html !== 'string') return '';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const walker = document.createTreeWalker(
      div,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    const nodesToRemove = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!allowedTags.includes(node.tagName.toLowerCase())) {
        nodesToRemove.push(node);
      }
      
      // Remove dangerous attributes
      if (node.hasAttributes()) {
        const attrs = Array.from(node.attributes);
        attrs.forEach(attr => {
          if (attr.name.startsWith('on') || attr.name === 'style') {
            node.removeAttribute(attr.name);
          }
        });
      }
    }

    nodesToRemove.forEach(node => {
      const textNode = document.createTextNode(node.textContent);
      node.replaceWith(textNode);
    });
    
    return div.innerHTML;
  }

  /**
   * Validates and sanitizes a URL
   * @param {string} url - URL to validate
   * @param {string[]} allowedProtocols - Allowed URL protocols
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeURL(url, allowedProtocols = ['http:', 'https:', 'mailto:']) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url, window.location.origin);
      if (allowedProtocols.includes(urlObj.protocol)) {
        return urlObj.href;
      }
    } catch (e) {
      // Invalid URL
    }
    
    return null;
  }
}
