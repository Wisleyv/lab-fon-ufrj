/**
 * Abstract Data Adapter
 * Provides a common interface for different data sources
 */

export class DataAdapter {
  /**
   * Fetches data from the source
   * @returns {Promise<Object>} Normalized data
   * @throws {Error} Must be implemented by subclass
   */
  async fetch() {
    throw new Error('Method fetch() must be implemented by subclass');
  }

  /**
   * Normalizes raw data to expected format
   * @param {*} rawData - Raw data from source
   * @returns {Object} Normalized data
   * @throws {Error} Must be implemented by subclass
   */
  normalize(rawData) {
    throw new Error('Method normalize() must be implemented by subclass');
  }

  /**
   * Handles errors during data fetching
   * @param {Error} error - The error that occurred
   * @returns {Object} Error response object
   */
  handleError(error) {
    console.error('Data fetch error:', error);
    return {
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates data structure
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  validate(data) {
    return data && typeof data === 'object' && !data.error;
  }
}
