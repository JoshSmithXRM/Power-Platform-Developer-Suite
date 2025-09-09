/**
 * Validation utilities for common data types
 * Shared across all webview components
 */

class ValidationUtils {
    /**
     * GUID/UUID validation regex pattern
     * Matches format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     * This constant replaces hardcoded GUID validation throughout the application
     */
    static GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    /**
     * Validate if a string is a valid GUID/UUID format
     * @param {string} value - The value to validate
     * @returns {boolean} True if valid GUID format
     */
    static isValidGuid(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        return this.GUID_REGEX.test(value.trim());
    }
    
    /**
     * Validate if a string is a valid email format
     * @param {string} value - The email to validate
     * @returns {boolean} True if valid email format
     */
    static isValidEmail(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.trim());
    }
    
    /**
     * Validate if a string is a valid URL format
     * @param {string} value - The URL to validate
     * @returns {boolean} True if valid URL format
     */
    static isValidUrl(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        try {
            new URL(value.trim());
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Validate if a string is a valid Dataverse URL
     * @param {string} value - The URL to validate
     * @returns {boolean} True if valid Dataverse URL format
     */
    static isValidDataverseUrl(value) {
        if (!this.isValidUrl(value)) {
            return false;
        }
        try {
            const url = new URL(value.trim());
            // Check for common Dataverse URL patterns
            return url.hostname.includes('.crm') || 
                   url.hostname.includes('.dynamics.com') ||
                   url.hostname.includes('.api.crm');
        } catch {
            return false;
        }
    }
    
    /**
     * Validate if a value is not empty (null, undefined, or whitespace)
     * @param {any} value - The value to validate
     * @returns {boolean} True if value is not empty
     */
    static isNotEmpty(value) {
        if (value === null || value === undefined) {
            return false;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        return true;
    }
    
    /**
     * Validate multiple fields at once
     * @param {Object} data - Object containing field values
     * @param {Object} rules - Object containing validation rules
     * @returns {string[]} Array of error messages
     */
    static validateFields(data, rules) {
        const errors = [];
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = data[field];
            
            // Required field validation
            if (fieldRules.required && !this.isNotEmpty(value)) {
                errors.push(`${fieldRules.label || field} is required`);
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!this.isNotEmpty(value)) {
                continue;
            }
            
            // GUID validation
            if (fieldRules.guid && !this.isValidGuid(value)) {
                errors.push(`${fieldRules.label || field} must be a valid GUID`);
            }
            
            // Email validation
            if (fieldRules.email && !this.isValidEmail(value)) {
                errors.push(`${fieldRules.label || field} must be a valid email address`);
            }
            
            // URL validation
            if (fieldRules.url && !this.isValidUrl(value)) {
                errors.push(`${fieldRules.label || field} must be a valid URL`);
            }
            
            // Dataverse URL validation
            if (fieldRules.dataverseUrl && !this.isValidDataverseUrl(value)) {
                errors.push(`${fieldRules.label || field} must be a valid Dataverse URL`);
            }
            
            // Custom validation function
            if (fieldRules.custom && typeof fieldRules.custom === 'function') {
                const customResult = fieldRules.custom(value);
                if (customResult !== true) {
                    errors.push(customResult || `${fieldRules.label || field} is invalid`);
                }
            }
        }
        
        return errors;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}
