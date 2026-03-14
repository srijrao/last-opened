/**
 * Living documentation for FileHandler behavior.
 *
 * These tests are intentionally written in a Given/When/Then style so
 * future contributors can understand behavior by reading executable code.
 */

import { App, TFile } from 'obsidian';
import { FileHandler } from '../fileHandler';
import { DEFAULT_SETTINGS, LastOpenedSettings } from '../settings';
import { createTimestampGenerator } from '../timestamp';
import { EventHandler } from '../eventHandler';

describe('FileHandler living documentation', () => {
	let settings: LastOpenedSettings;
	let mockEventHandler: EventHandler;

	beforeEach(() => {
		settings = { ...DEFAULT_SETTINGS };
		mockEventHandler = {} as EventHandler;
	});

	test('Given no adapter support, when updating types, then operation is skipped safely', async () => {
		const app = {
			vault: {
				configDir: '.obsidian'
			}
		} as App;

		const fileHandler = new FileHandler(
			app,
			settings,
			createTimestampGenerator(settings),
			mockEventHandler
		);

		const logSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		await expect(fileHandler.updateTypesJson()).resolves.not.toThrow();
		expect(logSpy).not.toHaveBeenCalled();
		logSpy.mockRestore();
	});

	test('Given an untracked note, when updating opened timestamp, then frontmatter is not modified', async () => {
		const file = { path: 'docs/demo.md', extension: 'md', parent: null } as TFile;
		const processFrontMatter = jest.fn(async (_file: TFile, callback: (frontmatter: Record<string, unknown>) => void) => {
			const frontmatter: Record<string, unknown> = {};
			callback(frontmatter);
		});

		const app = {
			fileManager: {
				processFrontMatter
			}
		} as App;

		const fileHandler = new FileHandler(
			app,
			settings,
			createTimestampGenerator(settings),
			mockEventHandler
		);

		await fileHandler.updateDateOpened(file);

		// One call for "has tracked keys" check. No second call means no write/update happened.
		expect(processFrontMatter).toHaveBeenCalledTimes(1);
	});

	test('Given tracked keys exist, when updating opened timestamp, then frontmatter update runs', async () => {
		const file = { path: 'docs/demo.md', extension: 'md', parent: null } as TFile;
		const processFrontMatter = jest.fn(async (_file: TFile, callback: (frontmatter: Record<string, unknown>) => void) => {
			const frontmatter: Record<string, unknown> = {
				[settings.dateOpenedKey]: '2026-01-01T00:00:00Z'
			};
			callback(frontmatter);
		});

		const app = {
			fileManager: {
				processFrontMatter
			}
		} as App;

		const fileHandler = new FileHandler(
			app,
			settings,
			createTimestampGenerator(settings),
			mockEventHandler
		);

		await fileHandler.updateDateOpened(file);

		// First call checks whether note is tracked, second call performs the update.
		expect(processFrontMatter).toHaveBeenCalledTimes(2);
	});
});
