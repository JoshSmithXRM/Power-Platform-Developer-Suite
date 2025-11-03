/**
 * XML formatting utility service.
 * Infrastructure layer - technical utility for presentation purposes.
 */
export class XmlFormatter {
	private readonly PADDING = '  ';

	/**
	 * Formats XML with proper indentation.
	 * @param xml - Raw XML string
	 * @returns Formatted XML with consistent indentation
	 */
	format(xml: string): string {
		if (!xml.trim()) {
			return xml;
		}

		try {
			return this.formatXmlInternal(xml);
		} catch (_error: unknown) {
			// Graceful degradation: malformed XML causes regex to throw, return unformatted
			return xml;
		}
	}

	/**
	 * Internal formatting logic with indentation.
	 * Uses regex-based tag detection for line breaks, then calculates padding depth for each line.
	 */
	private formatXmlInternal(xml: string): string {
		const reg = /(>)(<)(\/*)/g;
		const formatted = xml.replace(reg, '$1\n$2$3');

		let pad = 0;
		const lines = formatted.split('\n');
		const formattedLines: string[] = [];

		for (const line of lines) {
			let indent = 0;
			const trimmedLine = line.trim();

			if (trimmedLine.match(/.+<\/\w[^>]*>$/)) {
				indent = 0;
			} else if (trimmedLine.match(/^<\/\w/)) {
				if (pad > 0) {
					pad -= 1;
				}
			} else if (trimmedLine.match(/^<\w[^>]*[^/]>.*$/)) {
				indent = 1;
			}

			formattedLines.push(this.PADDING.repeat(pad) + trimmedLine);
			pad += indent;
		}

		return formattedLines.join('\n');
	}
}
