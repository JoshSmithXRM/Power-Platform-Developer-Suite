/**
 * HTML utility functions for Node.js environment (Extension Host context)
 * These functions provide DOM-like operations without requiring browser APIs
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * Node.js compatible version that doesn't use DOM APIs
 */
export function escapeHtml(text: string): string {
    if (!text) {
        return '';
    }
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}