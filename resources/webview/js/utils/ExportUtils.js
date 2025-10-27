/**
 * ExportUtils - Reusable export utilities for CSV and JSON formats
 *
 * Provides methods to export data in various formats with proper escaping
 * and formatting. Used across panels for consistent export functionality.
 */
class ExportUtils {
    /**
     * Export data to CSV format
     * @param {Array<Object>} data - Array of data objects to export
     * @param {string} filename - Filename without extension
     * @param {Array<string>} headers - Optional array of field names (uses object keys if not provided)
     * @param {Object} options - Optional configuration
     * @param {boolean} options.includeHeaders - Include header row (default: true)
     * @returns {void}
     */
    static exportToCSV(data, filename, headers = null, options = {}) {
        if (!data || data.length === 0) {
            console.error('ExportUtils.exportToCSV: No data to export');
            return;
        }

        const includeHeaders = options.includeHeaders !== false;
        const actualHeaders = headers || Object.keys(data[0]);

        const rows = [];

        // Add header row if requested
        if (includeHeaders) {
            rows.push(actualHeaders.join(','));
        }

        // Add data rows
        data.forEach(row => {
            const values = actualHeaders.map(header => {
                const value = row[header];
                return this._escapeCSVValue(value);
            });
            rows.push(values.join(','));
        });

        const csvContent = rows.join('\n');
        this._downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }

    /**
     * Export data to JSON format
     * @param {Array<Object>|Object} data - Data to export (array or object)
     * @param {string} filename - Filename without extension
     * @param {boolean} pretty - Pretty print JSON with indentation (default: true)
     * @returns {void}
     */
    static exportToJSON(data, filename, pretty = true) {
        if (!data) {
            console.error('ExportUtils.exportToJSON: No data to export');
            return;
        }

        const jsonContent = pretty
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data);

        this._downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
    }

    /**
     * Escape a value for safe use in CSV
     * @private
     * @param {*} value - Value to escape
     * @returns {string} - Escaped value
     */
    static _escapeCSVValue(value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return '';
        }

        // Convert to string
        const stringValue = String(value);

        // Check if value needs quoting (contains comma, newline, or quote)
        const needsQuoting = /[",\n\r]/.test(stringValue);

        if (needsQuoting) {
            // Escape quotes by doubling them (RFC 4180)
            const escaped = stringValue.replace(/"/g, '""');
            return `"${escaped}"`;
        }

        return stringValue;
    }

    /**
     * Trigger file download in browser
     * @private
     * @param {string} content - File content
     * @param {string} filename - Filename with extension
     * @param {string} mimeType - MIME type for the file
     * @returns {void}
     */
    static _downloadFile(content, filename, mimeType) {
        try {
            // Create blob with BOM for UTF-8 CSV files
            const BOM = mimeType.includes('csv') ? '\uFEFF' : '';
            const blob = new Blob([BOM + content], { type: mimeType });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;

            // Trigger download
            document.body.appendChild(a);
            a.click();

            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('ExportUtils._downloadFile: Failed to download file', error);
            throw new Error(`Failed to export file: ${error.message}`);
        }
    }

    /**
     * Generate timestamp-based filename
     * @param {string} prefix - Filename prefix
     * @param {string} extension - File extension without dot
     * @returns {string} - Formatted filename
     */
    static generateFilename(prefix, extension) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `${prefix}-${timestamp}.${extension}`;
    }

    /**
     * Export data with automatic filename generation
     * @param {Array<Object>} data - Data to export
     * @param {string} format - 'csv' or 'json'
     * @param {string} prefix - Filename prefix
     * @param {Array<string>} headers - Optional CSV headers
     * @returns {void}
     */
    static export(data, format, prefix, headers = null) {
        const filename = this.generateFilename(prefix, format);

        if (format.toLowerCase() === 'csv') {
            this.exportToCSV(data, filename.replace('.csv', ''), headers);
        } else if (format.toLowerCase() === 'json') {
            this.exportToJSON(data, filename.replace('.json', ''), true);
        } else {
            console.error(`ExportUtils.export: Unsupported format '${format}'`);
        }
    }
}

// Global registration for webview context
if (typeof window !== 'undefined') {
    window.ExportUtils = ExportUtils;
}
