import * as fs from 'fs/promises';

import * as vscode from 'vscode';

import type { ILogger } from '../../../infrastructure/logging/ILogger';
import { normalizeError } from '../../utils/ErrorUtils';

/**
 * Tabular data structure for CSV/JSON export.
 * Represents a table with column headers and rows of string values.
 */
export interface TabularData {
	/**
	 * Column headers in display order.
	 */
	readonly headers: readonly string[];

	/**
	 * Row data as arrays of string values.
	 * Each row array must have same length as headers.
	 */
	readonly rows: readonly (readonly string[])[];
}

/**
 * Shared service for exporting tabular data to CSV/JSON formats.
 * Provides generic export functionality that can be used by any feature.
 *
 * Used by: Data Explorer, Plugin Trace Viewer
 */
export class CsvExportService {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Converts tabular data to CSV format string.
	 *
	 * @param data - The tabular data to convert
	 * @returns CSV formatted string with proper escaping
	 */
	toCsv(data: TabularData): string {
		this.logger.debug('Converting tabular data to CSV', {
			columnCount: data.headers.length,
			rowCount: data.rows.length,
		});

		const csvRows: string[] = [];

		// Add header row
		csvRows.push(data.headers.map((h) => this.escapeCsvField(h)).join(','));

		// Add data rows
		for (const row of data.rows) {
			csvRows.push(row.map((cell) => this.escapeCsvField(cell)).join(','));
		}

		return csvRows.join('\n');
	}

	/**
	 * Converts an array of objects to JSON format string.
	 *
	 * @param data - Array of objects to convert
	 * @returns Pretty-printed JSON string
	 */
	toJson(data: readonly Record<string, unknown>[]): string {
		this.logger.debug('Converting data to JSON', { count: data.length });
		return JSON.stringify(data, null, 2);
	}

	/**
	 * Shows VS Code save dialog and saves content to selected file.
	 *
	 * @param content - The content to save
	 * @param suggestedFilename - Suggested filename for save dialog
	 * @returns Absolute path to saved file
	 * @throws Error if user cancels or save fails
	 */
	async saveToFile(
		content: string,
		suggestedFilename: string
	): Promise<string> {
		this.logger.debug('Showing save dialog', { suggestedFilename });

		try {
			const uri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(suggestedFilename),
				filters: this.getFileFilters(suggestedFilename),
			});

			if (!uri) {
				throw new Error('Save dialog cancelled by user');
			}

			await fs.writeFile(uri.fsPath, content, 'utf-8');

			this.logger.info('File saved successfully', { path: uri.fsPath });

			return uri.fsPath;
		} catch (error) {
			const normalizedError = normalizeError(error);
			const errorMessage = normalizedError.message || String(normalizedError);

			// User cancellation is expected - don't log as error
			if (errorMessage.includes('cancelled by user')) {
				this.logger.debug('Save dialog cancelled by user');
				throw normalizedError;
			}

			this.logger.error('Failed to save file', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Escapes a CSV field value according to RFC 4180.
	 * Handles commas, double quotes, and newlines.
	 *
	 * @param value - The field value to escape
	 * @returns Properly escaped CSV field
	 */
	escapeCsvField(value: string): string {
		if (
			value.includes(',') ||
			value.includes('"') ||
			value.includes('\n')
		) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	}

	/**
	 * Determines file filters based on suggested filename extension.
	 */
	private getFileFilters(
		suggestedFilename: string
	): Record<string, string[]> {
		const extension = suggestedFilename.split('.').pop()?.toLowerCase();

		if (extension === 'csv') {
			return {
				CSV: ['csv'],
				'All Files': ['*'],
			};
		} else if (extension === 'json') {
			return {
				JSON: ['json'],
				'All Files': ['*'],
			};
		}

		return {
			'All Files': ['*'],
		};
	}
}
