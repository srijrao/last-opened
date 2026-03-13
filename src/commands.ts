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
import { FileHandler } from './fileHandler';
import { UidHandler } from './uidHandler';

/**
 * CommandRegistry class manages all plugin commands
 * This keeps command logic organized and makes it easy to add new commands later
 */
export class CommandRegistry {
	constructor(
		private plugin: Plugin,
		private fileHandler: FileHandler,
		private uidHandler: UidHandler
	) { }

	/**
	 * Register all available commands for this plugin
	 * Called once when the plugin loads
	 */
	registerCommands(): void {
		this.registerAddKeysCommands();
		this.registerUidCommands();
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
			new Notice('No note is currently open. Please open a note first.');
			return;
		}

		try {
			await this.fileHandler.addYAMLKeys(activeFile, keyType);

			// Show success message
			const keyNames =
				keyType === 'both'
					? 'keys'
					: keyType === 'opened'
						? 'date_last_opened'
						: 'date_last_closed';

			new Notice(`✓ Added ${keyNames} to the note's frontmatter`);
		} catch (error) {
			console.error('Error adding keys to note:', error);
			new Notice(
				'✗ Failed to add keys. Please check the console for details.'
			);
		}
	}

	private async addUidToCurrentNote(replace: boolean): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('No note is currently open. Please open a note first.');
			return;
		}

		try {
			if (replace) {
				await this.uidHandler.addOrReplaceUid(activeFile);
				new Notice('✓ Added/Replaced unique ID in frontmatter');
				return;
			}

			const updated = await this.uidHandler.addUidIfAbsent(activeFile);
			new Notice(
				updated
					? '✓ Added unique ID in frontmatter'
					: 'UID key already has a value, nothing changed'
			);
		} catch (error) {
			console.error('Error adding UID to note:', error);
			new Notice('✗ Failed to add unique ID. Please check the console for details.');
		}
	}

	private async addUidToCurrentFolder(replace: boolean): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile();

		if (!activeFile || !activeFile.parent || !(activeFile.parent instanceof TFolder)) {
			new Notice('No folder context found. Open a note inside a folder first.');
			return;
		}

		try {
			const count = replace
				? await this.uidHandler.addOrReplaceUidToFolder(activeFile.parent)
				: await this.uidHandler.addUidIfAbsentToFolder(activeFile.parent);

			new Notice(`✓ Updated ${count} file(s)`);
		} catch (error) {
			console.error('Error adding UID to folder:', error);
			new Notice('✗ Failed to update folder UID values. Please check the console for details.');
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
	plugin: Plugin,
	fileHandler: FileHandler,
	uidHandler: UidHandler
): CommandRegistry {
	const registry = new CommandRegistry(plugin, fileHandler, uidHandler);
	registry.registerCommands();
	return registry;
}
