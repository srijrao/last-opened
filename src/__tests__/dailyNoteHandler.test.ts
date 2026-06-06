import { App, TFile } from 'obsidian';
import { DailyNoteHandler } from '../dailyNoteHandler';
import { DEFAULT_SETTINGS } from '../settings';

function makeFile(path: string): TFile {
	const file = new TFile();
	file.path = path;
	file.basename = path.split('/').pop()?.replace(/\.md$/, '') ?? path;
	file.extension = path.split('.').pop() ?? 'md';
	return file;
}

function makeApp(files: Record<string, string> = {}): App {
	const app = new App();
	const fileObjects = new Map<string, TFile>();

	for (const path of Object.keys(files)) {
		fileObjects.set(path, makeFile(path));
	}

	app.vault = {
		configDir: '.obsidian',
		adapter: {
			read: jest.fn(async (path: string) => {
				if (path === '.obsidian/daily-notes.json') {
					return JSON.stringify({
						folder: '__DN',
						format: 'YYYY-MM-DD',
					});
				}

				return files[path] ?? '';
			}),
			exists: jest.fn(async () => true),
			mkdir: jest.fn()
		},
		getAbstractFileByPath: jest.fn((path: string) => fileObjects.get(path) ?? null),
		read: jest.fn(async (file: TFile) => files[file.path] ?? ''),
		modify: jest.fn(async (file: TFile, content: string) => {
			files[file.path] = content;
		}),
		create: jest.fn(async (path: string, content: string) => {
			files[path] = content;
			fileObjects.set(path, makeFile(path));
		})
	} as any;

	app.workspace = {
		getActiveViewOfType: jest.fn(() => ({
			editor: {
				getSelection: jest.fn(() => '  highlighted text  ')
			}
		}))
	} as any;

	(app as any).metadataCache = {
		fileToLinktext: jest.fn(() => 'Notes/Source')
	};

	return app;
}

describe('DailyNoteHandler', () => {
	it('builds the daily note path from Daily Notes config', async () => {
		const app = makeApp();
		const handler = new DailyNoteHandler(app, { ...DEFAULT_SETTINGS }, () => new Date('2026-06-06T12:00:00Z'));

		await expect(handler.buildDailyNotePath()).resolves.toBe('__DN/2026-06-06.md');
	});

	it('appends highlighted text to an existing daily note using append format', async () => {
		const files = {
			'__DN/2026-06-06.md': 'Existing entry\n\n',
		};
		const app = makeApp(files);
		const handler = new DailyNoteHandler(
			app,
			{ ...DEFAULT_SETTINGS, dailyNoteAppendFormat: '- {{text}}' },
			() => new Date('2026-06-06T12:00:00Z')
		);

		const result = await handler.appendHighlightedTextToDailyNote();

		expect(result).toEqual({
			dailyNotePath: '__DN/2026-06-06.md',
			appendedText: '- highlighted text'
		});
		expect(app.vault.modify).toHaveBeenCalledWith(
			expect.objectContaining({ path: '__DN/2026-06-06.md' }),
			'Existing entry\n\n- highlighted text\n'
		);
	});

	it('creates the daily note when appending a current note wikilink', async () => {
		const app = makeApp();
		const handler = new DailyNoteHandler(app, { ...DEFAULT_SETTINGS }, () => new Date('2026-06-06T12:00:00Z'));
		const activeFile = makeFile('Notes/Source.md');

		const result = await handler.appendCurrentNoteLinkToDailyNote(activeFile);

		expect(result.appendedText).toBe('[[Notes/Source]]');
		expect(app.vault.create).toHaveBeenCalledWith('__DN/2026-06-06.md', '');
		expect(app.vault.modify).toHaveBeenCalledWith(
			expect.objectContaining({ path: '__DN/2026-06-06.md' }),
			'[[Notes/Source]]\n'
		);
	});

	it('uses a template note when append source is template', async () => {
		const files = {
			'__DN/2026-06-06.md': 'Existing entry',
			'templates/Append Template': '> {{text}}\n'
		};
		const app = makeApp(files);
		const handler = new DailyNoteHandler(
			app,
			{
				...DEFAULT_SETTINGS,
				dailyNoteAppendSource: 'template',
				dailyNoteTemplatePath: 'templates/Append Template'
			},
			() => new Date('2026-06-06T12:00:00Z')
		);

		const result = await handler.appendTextToDailyNote('templated text');

		expect(result.appendedText).toBe('> templated text');
		expect(app.vault.modify).toHaveBeenCalledWith(
			expect.objectContaining({ path: '__DN/2026-06-06.md' }),
			'Existing entry\n\n> templated text\n'
		);
	});
});
