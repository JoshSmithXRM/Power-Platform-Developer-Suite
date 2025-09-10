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

/**
 * Unescape HTML entities back to normal characters
 */
export function unescapeHtml(html: string): string {
    if (!html) {
        return '';
    }
    
    return html
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}

/**
 * Sanitize CSS class names to be valid
 */
export function sanitizeCssClass(className: string): string {
    if (!className) {
        return '';
    }
    
    return className
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

/**
 * Generate a safe HTML attribute value
 */
export function safeAttribute(value: string): string {
    return escapeHtml(value).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Create a data attribute string
 */
export function dataAttribute(name: string, value: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9-]/g, '');
    const safeValue = safeAttribute(value);
    return `data-${safeName}="${safeValue}"`;
}

/**
 * Join CSS classes, filtering out empty ones
 */
export function joinClasses(...classes: (string | undefined | null | false)[]): string {
    return classes
        .filter(Boolean)
        .map(cls => typeof cls === 'string' ? cls.trim() : '')
        .filter(cls => cls.length > 0)
        .join(' ');
}