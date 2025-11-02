import { ILogger } from '../../../infrastructure/logging/ILogger';
import { XmlFormatter } from '../formatters/XmlFormatter';

import { VsCodeEditorService } from './VsCodeEditorService';

// Mock vscode module before importing
jest.mock('vscode', () => ({
	workspace: {
		openTextDocument: jest.fn()
	},
	window: {
		showTextDocument: jest.fn()
	},
	ViewColumn: {
		Active: 1
	}
}), { virtual: true });

interface MockedVsCode {
	workspace: {
		openTextDocument: jest.Mock;
	};
	window: {
		showTextDocument: jest.Mock;
	};
}

describe('VsCodeEditorService', () => {
	let service: VsCodeEditorService;
	let mockLogger: jest.Mocked<ILogger>;
	let mockXmlFormatter: jest.Mocked<XmlFormatter>;
	let mockOpenTextDocument: jest.Mock;
	let mockShowTextDocument: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		mockXmlFormatter = {
			format: jest.fn((xml) => `[FORMATTED]\n${xml}`)
		} as unknown as jest.Mocked<XmlFormatter>;

		const vscode = jest.requireMock<MockedVsCode>('vscode');
		mockOpenTextDocument = vscode.workspace.openTextDocument;
		mockShowTextDocument = vscode.window.showTextDocument;

		service = new VsCodeEditorService(mockLogger, mockXmlFormatter);
	});

	describe('openXmlInNewTab', () => {
		it('should format XML and open in new editor tab', async () => {
			const xmlContent = '<root>Test</root>';
			const formattedXml = '[FORMATTED]\n<root>Test</root>';
			const mockDocument = {};

			mockXmlFormatter.format.mockReturnValue(formattedXml);
			mockOpenTextDocument.mockResolvedValue(mockDocument);
			mockShowTextDocument.mockResolvedValue(undefined);

			await service.openXmlInNewTab(xmlContent);

			// Verify formatter was called
			expect(mockXmlFormatter.format).toHaveBeenCalledWith(xmlContent);

			// Verify VS Code document was created with formatted content
			expect(mockOpenTextDocument).toHaveBeenCalledWith({
				content: formattedXml,
				language: 'xml'
			});

			// Verify document was shown
			expect(mockShowTextDocument).toHaveBeenCalledWith(mockDocument, {
				preview: false,
				viewColumn: 1
			});

			// Verify logging
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Opening XML in new editor tab',
				{ contentLength: xmlContent.length }
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Successfully opened and formatted XML in editor'
			);
		});

		it('should handle empty XML content', async () => {
			const emptyXml = '';
			const mockDocument = {};

			mockXmlFormatter.format.mockReturnValue(emptyXml);
			mockOpenTextDocument.mockResolvedValue(mockDocument);
			mockShowTextDocument.mockResolvedValue(undefined);

			await service.openXmlInNewTab(emptyXml);

			expect(mockXmlFormatter.format).toHaveBeenCalledWith(emptyXml);
			expect(mockOpenTextDocument).toHaveBeenCalledWith({
				content: '',
				language: 'xml'
			});
		});

		it('should handle long XML content', async () => {
			const longXml = '<root>' + 'x'.repeat(10000) + '</root>';
			const mockDocument = {};

			mockXmlFormatter.format.mockReturnValue(longXml);
			mockOpenTextDocument.mockResolvedValue(mockDocument);
			mockShowTextDocument.mockResolvedValue(undefined);

			await service.openXmlInNewTab(longXml);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Opening XML in new editor tab',
				{ contentLength: longXml.length }
			);
		});

		it('should log error and rethrow when document creation fails', async () => {
			const xmlContent = '<root>Test</root>';
			const error = new Error('Failed to create document');

			mockXmlFormatter.format.mockReturnValue(xmlContent);
			mockOpenTextDocument.mockRejectedValue(error);

			await expect(service.openXmlInNewTab(xmlContent)).rejects.toThrow('Failed to create document');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to open XML in editor',
				error
			);
		});

		it('should log error and rethrow when showTextDocument fails', async () => {
			const xmlContent = '<root>Test</root>';
			const error = new Error('Failed to show document');
			const mockDocument = {};

			mockXmlFormatter.format.mockReturnValue(xmlContent);
			mockOpenTextDocument.mockResolvedValue(mockDocument);
			mockShowTextDocument.mockRejectedValue(error);

			await expect(service.openXmlInNewTab(xmlContent)).rejects.toThrow('Failed to show document');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to open XML in editor',
				error
			);
		});

		it('should format XML before creating document', async () => {
			const xmlContent = '<root><unformatted>Content</unformatted></root>';
			const formattedXml = '<root>\n  <unformatted>Content</unformatted>\n</root>';
			const mockDocument = {};

			mockXmlFormatter.format.mockReturnValue(formattedXml);
			mockOpenTextDocument.mockResolvedValue(mockDocument);
			mockShowTextDocument.mockResolvedValue(undefined);

			await service.openXmlInNewTab(xmlContent);

			// Verify formatter was called with original content
			expect(mockXmlFormatter.format).toHaveBeenCalledWith(xmlContent);
			// Verify document was created with formatted content
			expect(mockOpenTextDocument).toHaveBeenCalledWith({
				content: formattedXml,
				language: 'xml'
			});
		});
	});
});
