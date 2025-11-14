/**
 * File handling module for YAML frontmatter manipulation
 *
 * This file contains all the logic for reading, updating, and validating
 * YAML frontmatter in Obsidian notes. It's separated so file operations
 * are isolated from timestamp logic and event handling.
 *
 * For beginners: YAML frontmatter is the metadata at the top of a note
 * between "---" markers. This file handles adding and updating those keys.
 */

import { TFile, App } from 'obsidian';
import { LastOpenedSettings } from './settings';
import { TimestampGenerator } from './timestamp';
import { EventHandler } from './eventHandler';

/**
 * FileHandler class manages all YAML frontmatter operations
 * This keeps file manipulation code organized and testable
 */
export class FileHandler {
	constructor(
		private app: App,
		private settings: LastOpenedSettings,
		private timestampGenerator: TimestampGenerator,
		private eventHandler: EventHandler
	) {}

	/**
	 * Update a file's frontmatter with a timestamp for opening
	 * Only updates if the user has "trackOpened" enabled in settings
	 *
	 * @param file - The note file to update
	 *
	 * Example for beginners:
	 * When you open a note, this method is called to record that opening time
	 * It checks settings first - if tracking is disabled, it does nothing.
	 */
	async updateDateOpened(file: TFile): Promise<void> {
		if (!this.settings.trackOpened) {
			return; // User disabled this feature, skip it
		}

		const key = this.settings.dateOpenedKey;
		await this.updateFrontmatterProperty(file, key);
	}

	/**
	 * Update a file's frontmatter with a timestamp for closing
	 * Only updates if the user has "trackClosed" enabled in settings
	 *
	 * @param file - The note file to update
	 */
	async updateDateClosed(file: TFile): Promise<void> {
		if (!this.settings.trackClosed) {
			return; // User disabled this feature, skip it
		}

		const key = this.settings.dateClosedKey;
		await this.updateFrontmatterProperty(file, key);
	}

	/**
	 * Add YAML keys to a file's frontmatter
	 * Creates frontmatter if it doesn't exist
	 * Uses stored opening time if available, otherwise current time
	 *
	 * @param file - The note file to update
	 * @param keyType - 'both' = add both keys, 'opened' = only date_opened, 'closed' = only date_closed
	 *
	 * This is called when the user runs the command "Add last-opened keys to note"
	 *
	 * For beginners: When you add keys to a note you opened earlier, this method
	 * remembers when you actually opened it, not when you ran the command.
	 * This ensures accurate timestamps even when you add tracking later.
	 */
	async addYAMLKeys(
		file: TFile,
		keyType: 'both' | 'opened' | 'closed' = 'both'
	): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			// For opened key: use stored opening time if available, otherwise current time
			let openedTimestamp: string;
			if (keyType === 'both' || keyType === 'opened') {
				const storedOpeningTime = this.eventHandler.getFileOpeningTime(file);
				if (storedOpeningTime) {
					// Use the stored opening time (when the file was actually opened)
					openedTimestamp = this.timestampGenerator.generateTimestamp(storedOpeningTime);
				} else {
					// Fallback to current time if no stored time (shouldn't happen in normal use)
					openedTimestamp = this.timestampGenerator.generateTimestamp();
				}
				frontmatter[this.settings.dateOpenedKey] = openedTimestamp;
			}

			// For closed key: always use current time (since we're adding it now)
			if (keyType === 'both' || keyType === 'closed') {
				const closedTimestamp = this.timestampGenerator.generateTimestamp();
				frontmatter[this.settings.dateClosedKey] = closedTimestamp;
			}
		});
	}

	/**
	 * Check if a file has the required YAML keys for this plugin
	 * Returns true if the file has at least one of the tracked keys
	 *
	 * @param file - The note file to check
	 * @returns true if file has at least one tracked key
	 *
	 * For beginners: This is like a "does this note belong to our plugin?" check.
	 * If a note has never had our YAML keys, we don't need to update it.
	 */
	async hasTrackedKeys(file: TFile): Promise<boolean> {
		let hasKeys = false;

		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			const hasOpened = this.settings.dateOpenedKey in frontmatter;
			const hasClosed = this.settings.dateClosedKey in frontmatter;

			hasKeys = hasOpened || hasClosed;
		});

		return hasKeys;
	}

	/**
	 * Private helper: Update a single property in frontmatter
	 * This is the workhorse method that does the actual update
	 *
	 * @param file - The note file to update
	 * @param property - The YAML key name (e.g., 'date_last_opened')
	 */
	private async updateFrontmatterProperty(
		file: TFile,
		property: string
	): Promise<void> {
		// First, check if the file has any tracked keys
		// We don't want to create new properties in notes that don't use our plugin
		const hasKeys = await this.hasTrackedKeys(file);

		if (!hasKeys) {
			return; // Don't modify files that aren't set up for this plugin
		}

		const timestamp = this.timestampGenerator.generateTimestamp();

		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[property] = timestamp;
		});
	}
}

/**
 * Factory function to create a FileHandler with all dependencies
 * This is a convenient way to set up the handler without passing lots of parameters
 *
 * @param app - Obsidian App instance
 * @param settings - Plugin settings
 * @param timestampGenerator - Timestamp generator instance
 * @param eventHandler - Event handler for accessing stored opening times
 * @returns A configured FileHandler instance
 */
export function createFileHandler(
	app: App,
	settings: LastOpenedSettings,
	timestampGenerator: TimestampGenerator,
	eventHandler: EventHandler
): FileHandler {
	return new FileHandler(app, settings, timestampGenerator, eventHandler);
}
