/**
 * Tests for types.json update functionality
 */

import { App } from 'obsidian';
import { FileHandler } from '../fileHandler';
import { LastOpenedSettings, DEFAULT_SETTINGS } from '../settings';
import { createTimestampGenerator } from '../timestamp';
import { EventHandler } from '../eventHandler';

describe('FileHandler types.json updates', () => {
	let app: App;
	let fileHandler: FileHandler;
	let settings: LastOpenedSettings;
	let mockAdapter: any;
	let mockEventHandler: any;

	beforeEach(() => {
		// Mock vault adapter
		mockAdapter = {
			read: jest.fn(),
			write: jest.fn()
		};

		// Mock app
		app = {
			vault: {
				configDir: '.obsidian',
				adapter: mockAdapter
			}
		} as any;

		// Use default settings
		settings = { ...DEFAULT_SETTINGS };

		// Mock event handler
		mockEventHandler = {} as EventHandler;

		// Create timestamp generator
		const timestampGenerator = createTimestampGenerator(settings);

		// Create file handler
		fileHandler = new FileHandler(app, settings, timestampGenerator, mockEventHandler);
	});

	describe('updateTypesJson', () => {
		test('should create types.json with datetime entries if file does not exist', async () => {
			// Mock that file doesn't exist
			mockAdapter.read.mockRejectedValue(new Error('File not found'));

			await fileHandler.updateTypesJson();

			// Verify write was called
			expect(mockAdapter.write).toHaveBeenCalled();
			const [path, content] = mockAdapter.write.mock.calls[0];
			expect(path).toBe('.obsidian/types.json');

			// Parse and verify content
			const data = JSON.parse(content);
			expect(data.types).toBeDefined();
			expect(data.types[settings.dateOpenedKey]).toBe('datetime');
			expect(data.types[settings.dateClosedKey]).toBe('datetime');
			expect(data.types[settings.lastViewKey]).toBe('datetime');
			expect(data.types[settings.lastUnfocusKey]).toBe('datetime');

			// Check numbered keys
			for (let i = 1; i <= 5; i++) {
				expect(data.types[`${settings.dateOpenedKey}_${i}`]).toBe('datetime');
				expect(data.types[`${settings.dateClosedKey}_${i}`]).toBe('datetime');
			}
		});

		test('should update existing types.json without removing other entries', async () => {
			const existingTypes = {
				types: {
					tags: 'tags',
					aliases: 'aliases',
					custom_field: 'text'
				}
			};

			mockAdapter.read.mockResolvedValue(JSON.stringify(existingTypes));

			await fileHandler.updateTypesJson();

			// Verify write was called
			expect(mockAdapter.write).toHaveBeenCalled();
			const [, content] = mockAdapter.write.mock.calls[0];

			// Parse and verify content
			const data = JSON.parse(content);

			// Check existing entries are preserved
			expect(data.types.tags).toBe('tags');
			expect(data.types.aliases).toBe('aliases');
			expect(data.types.custom_field).toBe('text');

			// Check our entries were added
			expect(data.types[settings.dateOpenedKey]).toBe('datetime');
			expect(data.types[settings.dateClosedKey]).toBe('datetime');
			expect(data.types[settings.lastViewKey]).toBe('datetime');
			expect(data.types[settings.lastUnfocusKey]).toBe('datetime');
		});

		test('should not write if no changes are needed', async () => {
			const existingTypes = {
				types: {
					[settings.dateOpenedKey]: 'datetime',
					[settings.dateClosedKey]: 'datetime',
					[settings.lastViewKey]: 'datetime',
					[settings.lastUnfocusKey]: 'datetime'
				}
			};

			// Add all numbered keys
			for (let i = 1; i <= 5; i++) {
				existingTypes.types[`${settings.dateOpenedKey}_${i}`] = 'datetime';
				existingTypes.types[`${settings.dateClosedKey}_${i}`] = 'datetime';
			}

			mockAdapter.read.mockResolvedValue(JSON.stringify(existingTypes));

			await fileHandler.updateTypesJson();

			// Verify write was NOT called since no changes
			expect(mockAdapter.write).not.toHaveBeenCalled();
		});

		test('should handle custom key names from settings', async () => {
			// Use custom settings
			settings.dateOpenedKey = 'custom_opened';
			settings.dateClosedKey = 'custom_closed';

			const timestampGenerator = createTimestampGenerator(settings);
			fileHandler = new FileHandler(app, settings, timestampGenerator, mockEventHandler);

			mockAdapter.read.mockRejectedValue(new Error('File not found'));

			await fileHandler.updateTypesJson();

			const [, content] = mockAdapter.write.mock.calls[0];
			const data = JSON.parse(content);

			expect(data.types['custom_opened']).toBe('datetime');
			expect(data.types['custom_closed']).toBe('datetime');
			expect(data.types['custom_opened_1']).toBe('datetime');
			expect(data.types['custom_closed_1']).toBe('datetime');
		});

		test('should handle corrupt types.json gracefully', async () => {
			// Mock invalid JSON
			mockAdapter.read.mockResolvedValue('{ invalid json }');

			await fileHandler.updateTypesJson();

			// Should create new types.json
			expect(mockAdapter.write).toHaveBeenCalled();
			const [, content] = mockAdapter.write.mock.calls[0];
			const data = JSON.parse(content);
			expect(data.types[settings.dateOpenedKey]).toBe('datetime');
		});

		test('should not throw error if write fails', async () => {
			mockAdapter.read.mockRejectedValue(new Error('File not found'));
			mockAdapter.write.mockRejectedValue(new Error('Write failed'));
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			// Should not throw
			await expect(fileHandler.updateTypesJson()).resolves.not.toThrow();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to update types.json:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		test('should safely skip types update when adapter capabilities are unavailable', async () => {
			app = {
				vault: {
					configDir: '.obsidian'
				}
			} as any;

			const timestampGenerator = createTimestampGenerator(settings);
			fileHandler = new FileHandler(app, settings, timestampGenerator, mockEventHandler);

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

			await expect(fileHandler.updateTypesJson()).resolves.not.toThrow();
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});
});
