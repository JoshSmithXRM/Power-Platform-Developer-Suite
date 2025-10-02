/**
 * XML Formatter Service
 * Provides XML formatting utilities following SOLID principles
 * Reusable across any service or panel that needs XML formatting
 */
export class XmlFormatterService {
    /**
     * Format XML string with proper indentation
     * @param xml - Raw XML string to format
     * @returns Formatted XML string with indentation
     */
    public formatXml(xml: string): string {
        if (!xml || typeof xml !== 'string') {
            return xml;
        }

        try {
            let formatted = xml;
            let indent = 0;
            const tab = '  '; // 2 spaces per indent level

            // Add line breaks between tags
            formatted = formatted.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
            const lines = formatted.split('\n');

            // Process each line to add proper indentation
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.length === 0) {
                    continue;
                }

                // Self-closing tag or content with closing tag on same line
                if (line.match(/.+<\/\w[^>]*>$/)) {
                    lines[i] = tab.repeat(indent) + line;
                }
                // Closing tag
                else if (line.match(/^<\/\w/)) {
                    if (indent > 0) {
                        indent--;
                    }
                    lines[i] = tab.repeat(indent) + line;
                }
                // Opening tag
                else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
                    lines[i] = tab.repeat(indent) + line;
                    indent++;
                }
                // Other content
                else {
                    lines[i] = tab.repeat(indent) + line;
                }
            }

            return lines.join('\n');
        } catch (error) {
            // If formatting fails, return original XML
            return xml;
        }
    }

    /**
     * Validate if string is valid XML
     * @param xml - String to validate
     * @returns True if valid XML, false otherwise
     */
    public isValidXml(xml: string): boolean {
        if (!xml || typeof xml !== 'string') {
            return false;
        }

        try {
            // Basic XML validation - check for balanced tags
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const parserError = xmlDoc.getElementsByTagName('parsererror');
            return parserError.length === 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Minify XML by removing whitespace and line breaks
     * @param xml - Formatted XML string
     * @returns Minified XML string
     */
    public minifyXml(xml: string): string {
        if (!xml || typeof xml !== 'string') {
            return xml;
        }

        try {
            return xml
                .replace(/>\s+</g, '><')  // Remove whitespace between tags
                .replace(/\s+/g, ' ')      // Collapse multiple spaces
                .trim();
        } catch (error) {
            return xml;
        }
    }
}
