// Frontend JavaScript types documentation (compatible with mc-router API)

/**
 * @typedef {Object} ServerMapping
 * @property {string} hostname - The hostname clients connect to
 * @property {string} backend - The backend server address
 * @property {boolean} [is_default] - Whether this is the default route
 */

/**
 * @typedef {Object} DisplayMapping
 * @property {string} hostname - The hostname clients connect to
 * @property {string} backend - The backend server address
 * @property {boolean} is_default - Whether this is the default route
 */

/**
 * @typedef {Object} ApiResponse
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message if request failed
 * @property {string} [message] - Success message
 */

// Export empty object for ES6 module compatibility
export {};