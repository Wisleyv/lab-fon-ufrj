/**
 * JSON Data Adapter
 * Fetches data from local JSON files
 */

import { DataAdapter } from "./DataAdapter.js";

export class JSONAdapter extends DataAdapter {
  /**
   * Creates a JSON adapter instance
   * @param {string} url - URL to the JSON file
   * @param {number} retries - Number of retry attempts
   * @param {number} timeout - Request timeout in milliseconds
   */
  constructor(url, retries = 3, timeout = 5000) {
    super();
    this.url = url;
    this.retries = retries;
    this.timeout = timeout;
  }

  /**
   * Fetches data from JSON file with retry logic
   * @returns {Promise<Object>} Normalized data
   */
  async fetch() {
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(this.url, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        const normalizedData = this.normalize(rawData);

        if (!this.validate(normalizedData)) {
          throw new Error("Data validation failed");
        }

        return normalizedData;
      } catch (error) {
        console.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);

        // Last attempt - throw error
        if (attempt === this.retries - 1) {
          return this.handleError(error);
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
  }

  /**
   * Normalizes JSON data
   * @param {Object} rawData - Raw JSON data
   * @returns {Object} Normalized data
   */
  normalize(rawData) {
    // JSON data is already in the expected format
    // Additional normalization can be added here if needed
    return {
      ...rawData,
      _loaded: true,
      _timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validates the structure of fetched data
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  validate(data) {
    if (!super.validate(data)) return false;

    // Check if data has expected structure
    // Accept either new structure (equipe) or legacy structure (pesquisadores/coordenacao)
    return (
      data.hasOwnProperty("equipe") ||
      data.hasOwnProperty("pesquisadores") || 
      data.hasOwnProperty("coordenacao")
    );
  }
}
