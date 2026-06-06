import { App, MarkdownView, TFile } from 'obsidian';
import moment from 'moment';
import { LastOpenedSettings } from './settings';

interface DailyNoteSettings {
	folder: string;
	format: string;
	extension: string;
	appendSource: LastOpenedSettings['dailyNoteAppendSource'];
	appendFormat: string;
	templatePath: string;
}

interface AppendResult {
	dailyNotePath: string;
	appendedText: string;
}

function normalizeFolderPath(value: unknown): string {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim().replace(/^\/+|\/+$/g, '');
}

function normalizeExtension(value: unknown): string {
	if (typeof value !== 'string') {
		return 'md';
	}

	const trimmed = value.trim().replace(/^\./, '');
	return trimmed.length > 0 ? trimmed : 'md';
}

function readStringOption(
	options: Record<string, unknown>,
	keys: string[],
	fallback: string
): string {
	for (const key of keys) {
		const value = options[key];
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim();
		}
	}

	return fallback;
}

function trimTrailingBlankLines(text: string): string {
	return text.replace(/\s+$/g, '');
}

function replaceAppendToken(text: string, replacement: string): string {
	return text.replace(/\{\{text\}\}/g, replacement).replace(/\{text\}/g, replacement);
}

export class DailyNoteHandler {
	constructor(
		private app: App,
		private settings: LastOpenedSettings,
		private nowProvider: () => Date = () => new Date()
	) { }

	async appendHighlightedTextToDailyNote(): Promise<AppendResult | null> {
		const highlightedText = this.getHighlightedText();
		if (!highlightedText) {
			return null;
		}

		return this.appendTextToDailyNote(highlightedText);
	}

	async appendCurrentNoteLinkToDailyNote(activeFile: TFile): Promise<AppendResult> {
		const dailyNote = await this.resolveDailyNoteFile();
		if (!dailyNote) {
			throw new Error('Daily note could not be resolved.');
		}

		const linkText = this.buildWikilink(activeFile, dailyNote.path);
		return this.appendTextToDailyNote(linkText, dailyNote);
	}

	getHighlightedText(): string | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const selection = view?.editor?.getSelection()?.trim();
		return selection && selection.length > 0 ? selection : null;
	}

	async appendTextToDailyNote(text: string, dailyNote?: TFile): Promise<AppendResult> {
		const targetFile = dailyNote ?? await this.resolveDailyNoteFile();
		if (!targetFile) {
			throw new Error('Daily note could not be resolved.');
		}

		const appendedText = trimTrailingBlankLines(await this.buildAppendedText(text));
		const existing = await this.readExistingContent(targetFile);
		const nextContent = existing.length > 0
			? `${trimTrailingBlankLines(existing)}\n\n${appendedText}\n`
			: `${appendedText}\n`;

		await this.writeContent(targetFile.path, nextContent);
		return {
			dailyNotePath: targetFile.path,
			appendedText
		};
	}

	async buildDailyNotePath(): Promise<string> {
		const settings = await this.getDailyNoteSettings();
		const dateString = moment(this.nowProvider()).format(settings.format);
		const fileName = `${dateString}.${settings.extension}`;
		return settings.folder ? `${settings.folder}/${fileName}` : fileName;
	}

	async getDailyNoteSettings(): Promise<DailyNoteSettings> {
		const config = await this.readDailyNotesConfig();
		const plugin = this.getDailyNotesPlugin();
		const options = this.getDailyNotesOptions(plugin);

		return {
			folder: normalizeFolderPath(
				config?.folder ?? readStringOption(options, ['folder', 'folderPath', 'dailyNotesFolder'], '')
			),
			format: typeof config?.format === 'string'
				? config.format
				: readStringOption(options, ['format', 'dateFormat', 'newFileNameFormat'], 'YYYY-MM-DD'),
			extension: normalizeExtension(readStringOption(options, ['extension', 'fileExtension'], 'md')),
			appendSource: this.settings.dailyNoteAppendSource || 'text',
			appendFormat: this.settings.dailyNoteAppendFormat || '{{text}}',
			templatePath: this.settings.dailyNoteTemplatePath || ''
		};
	}

	async resolveDailyNoteFile(): Promise<TFile | null> {
		const dailyNotePath = await this.buildDailyNotePath();
		const existing = this.app.vault.getAbstractFileByPath(dailyNotePath);
		if (existing instanceof TFile) {
			return existing;
		}

		const parentFolder = dailyNotePath.includes('/')
			? dailyNotePath.slice(0, dailyNotePath.lastIndexOf('/'))
			: '';
		if (parentFolder) {
			await this.ensureFolderExists(this.app.vault.adapter, parentFolder);
		}

		await this.app.vault.create(dailyNotePath, '');
		const created = this.app.vault.getAbstractFileByPath(dailyNotePath);
		return created instanceof TFile ? created : null;
	}

	private async readDailyNotesConfig(): Promise<Record<string, unknown> | null> {
		const configDir = this.app.vault?.configDir;
		const adapter = this.app.vault?.adapter;
		if (!configDir || typeof adapter?.read !== 'function') {
			return null;
		}

		try {
			const content = await adapter.read(`${configDir}/daily-notes.json`);
			const parsed = JSON.parse(content);
			return parsed && typeof parsed === 'object' ? parsed : null;
		} catch (_error) {
			return null;
		}
	}

	private getDailyNotesPlugin(): unknown {
		const internalPlugins = (this.app as App & {
			internalPlugins?: {
				getPluginById?: (id: string) => unknown;
				plugins?: Record<string, unknown>;
			};
		}).internalPlugins;
		if (!internalPlugins) {
			return null;
		}

		return internalPlugins.getPluginById?.('daily-notes') ?? internalPlugins.plugins?.['daily-notes'] ?? null;
	}

	private getDailyNotesOptions(plugin: unknown): Record<string, unknown> {
		if (!plugin || typeof plugin !== 'object') {
			return {};
		}

		const p = plugin as {
			instance?: { options?: Record<string, unknown>; settings?: Record<string, unknown> };
			options?: Record<string, unknown>;
			settings?: Record<string, unknown>;
		};

		return p.instance?.options ?? p.instance?.settings ?? p.options ?? p.settings ?? {};
	}

	private async readExistingContent(file: TFile): Promise<string> {
		const abstractFile = this.app.vault.getAbstractFileByPath(file.path);
		if (!(abstractFile instanceof TFile)) {
			return '';
		}

		return this.app.vault.read(abstractFile);
	}

	private async writeContent(path: string, content: string): Promise<void> {
		const adapter = this.app.vault.adapter;
		const parentFolder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
		if (parentFolder) {
			await this.ensureFolderExists(adapter, parentFolder);
		}

		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
			return;
		}

		await this.app.vault.create(path, content);
	}

	private async ensureFolderExists(adapter: { exists: (path: string) => Promise<boolean>; mkdir: (path: string) => Promise<void> }, folderPath: string): Promise<void> {
		const parts = folderPath.split('/');
		let current = '';

		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (!await adapter.exists(current)) {
				await adapter.mkdir(current);
			}
		}
	}

	private buildWikilink(activeFile: TFile, targetPath: string): string {
		const metadataCache = (this.app as App & {
			metadataCache?: { fileToLinktext?: (file: TFile, sourcePath: string, omitMdExtension?: boolean) => string };
		}).metadataCache;
		const linkText = metadataCache?.fileToLinktext?.(activeFile, targetPath, true) ?? activeFile.basename;
		return `[[${linkText}]]`;
	}

	private async buildAppendedText(text: string): Promise<string> {
		const settings = await this.getDailyNoteSettings();
		if (settings.appendSource === 'template') {
			const templateFile = this.app.vault.getAbstractFileByPath(settings.templatePath);
			if (!(templateFile instanceof TFile)) {
				throw new Error('Template note could not be found for daily note appends.');
			}

			const templateContent = await this.app.vault.read(templateFile);
			return replaceAppendToken(templateContent, text);
		}

		return replaceAppendToken(settings.appendFormat, text);
	}
}
