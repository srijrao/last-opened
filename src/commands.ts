/**
 * Commands module - User-facing plugin commands
 *
 * Commands are actions users can trigger manually through the Obsidian command palette
 * or bind to hotkeys. This file registers all available commands.
 *
 * For beginners: If you type Ctrl+P in Obsidian and search for "Last Opened",
 * you'll see the commands defined here. Each one does a specific action.
 */

import { Plugin, Notice, TFolder } from 'obsidian';
import LastOpenedPlugin from './main';
import { FileHandler } from './fileHandler';
import { UidHandler } from './uidHandler';
import { DailyNoteHandler } from './dailyNoteHandler';
import { LastOpenedSettings } from './settings';

function shouldShowNotifications(settings?: Partial<LastOpenedSettings>): boolean {
	return settings?.showNotifications !== false;
}

function showPluginNotice(
	settings: Partial<LastOpenedSettings> | undefined,
	message: string,
	timeout?: number
): void {
	if (!shouldShowNotifications(settings)) {
		return;
	}

	if (typeof timeout === 'number') {
		new Notice(message, timeout);
		return;
	}

	new Notice(message);
}

function formatUidFolderSummary(action: string, modifiedFiles: number, totalFiles: number): string {
	return `${action} ${modifiedFiles} of ${totalFiles} file(s)`;
}

function formatDuplicateUidNotice(
	groups: Array<{ uid: string; files: Array<{ path: string }> }>
): string {
	const duplicateFileCount = groups.reduce((total, group) => total + group.files.length, 0);
	const lines = [`Found ${groups.length} duplicate UID value(s) across ${duplicateFileCount} file(s):`];

	for (const group of groups) {
		lines.push(`UID \"${group.uid}\"`);
		for (const file of group.files) {
			lines.push(`- ${file.path}`);
		}
	}

	return lines.join('\n');
}

/**
 * CommandRegistry class manages all plugin commands
 * This keeps command logic organized and makes it easy to add new commands later
 */
export class CommandRegistry {
	constructor(
		private plugin: LastOpenedPlugin,
		private fileHandler: FileHandler,
		private dailyNoteHandler: DailyNoteHandler,
		private uidHandler: UidHandler
	) { }

	/**
	 * Register all available commands for this plugin
	 * Called once when the plugin loads
	 */
	registerCommands(): void {
		this.registerAddKeysCommands();
		this.registerDailyNoteCommands();
		this.registerUidCommands();
	}

	private registerDailyNoteCommands(): void {
		this.plugin.addCommand({
			id: 'last-opened-daily-note-append-selection',
			name: 'Append highlighted text to current day\'s daily note',
			callback: async () => {
				await this.appendHighlightedTextToDailyNote();
			}
		});

		this.plugin.addCommand({
			id: 'last-opened-daily-note-append-link',
			name: 'Append wikilink to current day\'s daily note',
			callback: async () => {
				await this.appendActiveNoteLinkToDailyNote();
			}
		});
	}

	private registerUidCommands(): void {
		this.plugin.addCommand({
			id: 'last-opened-uid-add-if-absent',
			name: 'Add unique ID to YAML if not present',
			callback: async () => {
				await this.addUidToCurrentNote(false);
			}
		});

		this.plugin.addCommand({
			id: 'last-opened-uid-add-or-replace',
			name: 'Add/Replace unique ID to YAML',
			callback: async () => {
				await this.addUidToCurrentNote(true);
			}
		});

		this.plugin.addCommand({
			id: 'last-opened-uid-add-if-absent-folder',
			name: 'Add unique ID to YAML if not present to folder',
			callback: async () => {
				await this.addUidToCurrentFolder(false);
			}
		});

		this.plugin.addCommand({
			id: 'last-opened-uid-add-or-replace-folder',
			name: 'Add/Replace unique ID to YAML to folder',
			callback: async () => {
				await this.addUidToCurrentFolder(true);
			}
		});

		this.plugin.addCommand({
			id: 'last-opened-uid-find-duplicates',
			name: 'Find files with duplicate unique IDs',
			callback: async () => {
				await this.findDuplicateUids();
			}
		});
	}

	/**
	 * Register commands for adding YAML keys to notes
	 * Three variants: add both keys, or add each one individually
	 * This gives users flexibility in case they only want one key
	 */
	private registerAddKeysCommands(): void {
		// Command: Add both keys
		this.plugin.addCommand({
			id: 'last-opened-add-both-keys',
			name: 'Add last-opened and last-closed keys',
			callback: async () => {
				await this.addKeysToCurrentNote('both');
			}
		});

		// Command: Add only the opened key
		this.plugin.addCommand({
			id: 'last-opened-add-opened-key',
			name: 'Add only last-opened key',
			callback: async () => {
				await this.addKeysToCurrentNote('opened');
			}
		});

		// Command: Add only the closed key
		this.plugin.addCommand({
			id: 'last-opened-add-closed-key',
			name: 'Add only last-closed key',
			callback: async () => {
				await this.addKeysToCurrentNote('closed');
			}
		});
	}

	/**
	 * Add YAML keys to the currently open note
	 * Shows a notification if successful or if there's an error
	 *
	 * @param keyType - Which key(s) to add: 'both', 'opened', or 'closed'
	 *
	 * For beginners: "callback" means "what function to run when the user clicks this command"
	 * We show notifications (the toast-like messages) to give feedback.
	 */
	private async addKeysToCurrentNote(
		keyType: 'both' | 'opened' | 'closed'
	): Promise<void> {
		// Get the file the user is currently editing
		const activeFile = this.plugin.app.workspace.getActiveFile();

		if (!activeFile) {
			showPluginNotice(this.plugin.settings, 'No note is currently open. Please open a note first.');
			return;
		}

		try {
			await this.fileHandler.addYAMLKeys(activeFile, keyType);
			const pluginWithSettings = this.plugin as Plugin & {
				settings?: {
					dateOpenedKey?: string;
					dateClosedKey?: string;
				};
			};
			const openedKey = pluginWithSettings.settings?.dateOpenedKey || 'last_opened';
			const closedKey = pluginWithSettings.settings?.dateClosedKey || 'last_closed';

			// Show success message
			const keyNames =
				keyType === 'both'
					? 'keys'
					: keyType === 'opened'
						? openedKey
						: closedKey;

			showPluginNotice(this.plugin.settings, `✓ Added ${keyNames} to the note's frontmatter`);
		} catch (error) {
			console.error('Error adding keys to note:', error);
			showPluginNotice(
				this.plugin.settings,
				'✗ Failed to add keys. Please check the console for details.'
			);
		}
	}

	private async addUidToCurrentNote(replace: boolean): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			showPluginNotice(this.plugin.settings, 'No note is currently open. Please open a note first.');
			return;
		}

		const showNotice = this.plugin?.settings?.showUidNotice !== false;
		try {
			let updated: boolean | void = false;
			if (replace) {
				await this.uidHandler.addOrReplaceUid(activeFile);
				updated = true;
			} else {
				updated = await this.uidHandler.addUidIfAbsent(activeFile);
			}

			if (showNotice) {
				if (replace) {
					showPluginNotice(this.plugin.settings, '✓ Added/Replaced unique ID in frontmatter');
				} else {
					showPluginNotice(
						this.plugin.settings,
						updated
							? '✓ Added unique ID in frontmatter'
							: 'UID key already has a value, nothing changed',
						900
					);
				}
			}
		} catch (error) {
			console.error('Error adding UID to note:', error);
			if (showNotice) {
				showPluginNotice(this.plugin.settings, '✗ Failed to add unique ID. Please check the console for details.');
			}
		}
	}

	private async addUidToCurrentFolder(replace: boolean): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile();

		if (!activeFile || !activeFile.parent || !(activeFile.parent instanceof TFolder)) {
			showPluginNotice(this.plugin.settings, 'No folder context found. Open a note inside a folder first.');
			return;
		}

		try {
			const result = replace
				? await this.uidHandler.addOrReplaceUidToFolder(activeFile.parent)
				: await this.uidHandler.addUidIfAbsentToFolder(activeFile.parent);

			showPluginNotice(
				this.plugin.settings,
				replace
					? formatUidFolderSummary('Replaced UIDs in', result.modifiedFiles, result.totalFiles)
					: formatUidFolderSummary('Added UIDs to', result.modifiedFiles, result.totalFiles)
			);
		} catch (error) {
			console.error('Error adding UID to folder:', error);
			showPluginNotice(this.plugin.settings, '✗ Failed to update folder UID values. Please check the console for details.');
		}
	}

	private async appendHighlightedTextToDailyNote(): Promise<void> {
		try {
			const result = await this.dailyNoteHandler.appendHighlightedTextToDailyNote();

			if (!result) {
				showPluginNotice(this.plugin.settings, 'No text is highlighted in the active note.');
				return;
			}

			showPluginNotice(this.plugin.settings, '✓ Appended highlighted text to today\'s daily note');
		} catch (error) {
			console.error('Error appending highlighted text to daily note:', error);
			showPluginNotice(this.plugin.settings, '✗ Failed to append highlighted text to the daily note. Please check the console for details.');
		}
	}

	private async appendActiveNoteLinkToDailyNote(): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			showPluginNotice(this.plugin.settings, 'No note is currently open. Please open a note first.');
			return;
		}

		try {
			await this.dailyNoteHandler.appendCurrentNoteLinkToDailyNote(activeFile);
			showPluginNotice(this.plugin.settings, '✓ Appended a wikilink to today\'s daily note');
		} catch (error) {
			console.error('Error appending note link to daily note:', error);
			showPluginNotice(this.plugin.settings, '✗ Failed to append the wikilink to the daily note. Please check the console for details.');
		}
	}

	private async findDuplicateUids(): Promise<void> {
		try {
			const groups = await this.uidHandler.findDuplicateUids();

			if (groups.length === 0) {
				showPluginNotice(this.plugin.settings, 'No duplicate UIDs found.');
				return;
			}

			const message = formatDuplicateUidNotice(groups);
			console.warn(message);
			showPluginNotice(this.plugin.settings, message);
		} catch (error) {
			console.error('Error finding duplicate UIDs:', error);
			showPluginNotice(this.plugin.settings, '✗ Failed to scan for duplicate UIDs. Please check the console for details.');
		}
	}
}

/**
 * Factory function to create and register all commands
 * Convenient shorthand for setting up the command registry
 *
 * @param plugin - The plugin instance
 * @param fileHandler - File handler for adding keys
 * @returns A configured CommandRegistry with all commands registered
 */
export function setupCommands(
	plugin: LastOpenedPlugin,
	fileHandler: FileHandler,
	uidHandler: UidHandler
): CommandRegistry {
	const dailyNoteHandler = new DailyNoteHandler(plugin.app, plugin.settings);
	const registry = new CommandRegistry(plugin, fileHandler, dailyNoteHandler, uidHandler);
	registry.registerCommands();
	return registry;
}
