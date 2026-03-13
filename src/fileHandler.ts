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
	 * Update frontmatter key for when a file is focused within a tab group
	 */
	async updateLastView(file: TFile): Promise<void> {
		const key = this.settings.lastViewKey;
		const timestamp = this.timestampGenerator.generateTimestamp();
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[key] = timestamp;
		});
	}

	/**
	 * Update frontmatter key for when a file loses focus within a tab group
	 */
	async updateLastUnfocus(file: TFile): Promise<void> {
		const key = this.settings.lastUnfocusKey;
		const timestamp = this.timestampGenerator.generateTimestamp();
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[key] = timestamp;
		});
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
					openedTimestamp = this.timestampGenerator.generateTimestamp(storedOpeningTime);
				} else {
					openedTimestamp = this.timestampGenerator.generateTimestamp();
				}

				// Respect historyDepth: single string if 1, otherwise numbered keys
			// Allow per-file override: `<baseKey>_history` numeric in frontmatter
			// Cap at 5 for memory management
			let depth = Math.min(5, Math.max(1, this.settings.historyDepth || 1));
			const overrideKey = `${this.settings.dateOpenedKey}_history`;
				if (overrideKey in frontmatter) {
					const ov = frontmatter[overrideKey];
					const maybeNum = typeof ov === 'number' ? ov : parseInt(String(ov), 10);
					if (!Number.isNaN(maybeNum) && maybeNum >= 1) {
						depth = Math.min(5, maybeNum);
					}
				}
				if (depth === 1) {
					frontmatter[this.settings.dateOpenedKey] = openedTimestamp;
				} else {
					// Shift existing numbered keys up and set _1
					for (let i = depth; i >= 2; i--) {
						const prevKey = i === 2 ? `${this.settings.dateOpenedKey}_1` : `${this.settings.dateOpenedKey}_${i - 1}`;
						const targetKey = `${this.settings.dateOpenedKey}_${i}`;
						if (prevKey in frontmatter) {
							(frontmatter as Record<string, unknown>)[targetKey] = (frontmatter as Record<string, unknown>)[prevKey];
						} else {
							delete (frontmatter as Record<string, unknown>)[targetKey];
						}
					}
				(frontmatter as Record<string, unknown>)[`${this.settings.dateOpenedKey}_1`] = openedTimestamp;
				// Always set base key to newest
				(frontmatter as Record<string, unknown>)[this.settings.dateOpenedKey] = openedTimestamp;

				// Clean up any numbered keys beyond the per-file depth
				if (depth === 1) {
					// For depth 1, delete all numbered keys
					for (const key of Object.keys(frontmatter)) {
						const m = key.match(new RegExp(`^${this.settings.dateOpenedKey}_(\\d+)$`));
						if (m) {
							delete (frontmatter as Record<string, unknown>)[key];
						}
					}
				} else {
					for (const key of Object.keys(frontmatter)) {
						const m = key.match(new RegExp(`^${this.settings.dateOpenedKey}_(\\d+)$`));
						if (m) {
							const idx = parseInt(m[1], 10);
							if (idx > depth) {
								delete (frontmatter as Record<string, unknown>)[key];
							}
						}
					}
				}
				}
			}

			// For closed key: always use current time (since we're adding it now)
			if (keyType === 'both' || keyType === 'closed') {
				const closedTimestamp = this.timestampGenerator.generateTimestamp();
			// Cap at 5 for memory management
			let depth = Math.min(5, Math.max(1, this.settings.historyDepth || 1));
			const overrideKeyC = `${this.settings.dateClosedKey}_history`;
				if (overrideKeyC in frontmatter) {
					const ov = frontmatter[overrideKeyC];
					const maybeNum = typeof ov === 'number' ? ov : parseInt(String(ov), 10);
					if (!Number.isNaN(maybeNum) && maybeNum >= 1) {
						depth = Math.min(5, maybeNum);
					}
				}
				if (depth === 1) {
					frontmatter[this.settings.dateClosedKey] = closedTimestamp;
				} else {
					for (let i = depth; i >= 2; i--) {
						const prevKey = i === 2 ? `${this.settings.dateClosedKey}_1` : `${this.settings.dateClosedKey}_${i - 1}`;
						const targetKey = `${this.settings.dateClosedKey}_${i}`;
						if (prevKey in frontmatter) {
							(frontmatter as Record<string, unknown>)[targetKey] = (frontmatter as Record<string, unknown>)[prevKey];
						} else {
							delete (frontmatter as Record<string, unknown>)[targetKey];
						}
					}
				(frontmatter as Record<string, unknown>)[`${this.settings.dateClosedKey}_1`] = closedTimestamp;
				// Always set base key to newest
				(frontmatter as Record<string, unknown>)[this.settings.dateClosedKey] = closedTimestamp;

				// Clean up any numbered keys beyond the per-file depth
				if (depth === 1) {
					// For depth 1, delete all numbered keys
					for (const key of Object.keys(frontmatter)) {
						const m = key.match(new RegExp(`^${this.settings.dateClosedKey}_(\\d+)$`));
						if (m) {
							delete (frontmatter as Record<string, unknown>)[key];
						}
					}
				} else {
					for (const key of Object.keys(frontmatter)) {
						const m = key.match(new RegExp(`^${this.settings.dateClosedKey}_(\\d+)$`));
						if (m) {
							const idx = parseInt(m[1], 10);
							if (idx > depth) {
								delete (frontmatter as Record<string, unknown>)[key];
							}
						}
					}
				}
				}
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
			const openedBase = this.settings.dateOpenedKey;
			const closedBase = this.settings.dateClosedKey;

			// Also consider per-file override key e.g. `date_last_opened_history`
			const openedHistoryKey = `${openedBase}_history`;
			const closedHistoryKey = `${closedBase}_history`;

			const hasOpened = openedBase in frontmatter || `${openedBase}_1` in frontmatter || openedHistoryKey in frontmatter;
			const hasClosed = closedBase in frontmatter || `${closedBase}_1` in frontmatter || closedHistoryKey in frontmatter;

			hasKeys = hasOpened || hasClosed;
		});

		return hasKeys;
	}

	/**
	 * Update Obsidian's types.json file to register our datetime properties
	 * This ensures the Properties panel displays our timestamps correctly
	 * 
	 * For beginners: The types.json file tells Obsidian what type each property is.
	 * By registering our keys as "datetime", Obsidian knows to format them as dates.
	 */
	async updateTypesJson(): Promise<void> {
		try {
			const configDir = this.app.vault.configDir;
			const typesPath = `${configDir}/types.json`;
			
			// Read existing types.json or create new structure
			let typesData: { types: Record<string, string> };
			try {
				const content = await this.app.vault.adapter.read(typesPath);
				typesData = JSON.parse(content);
				
				// Ensure types object exists
				if (!typesData.types || typeof typesData.types !== 'object') {
					typesData = { types: {} };
				}
			} catch (error) {
				// File doesn't exist or is invalid, create new structure
				typesData = { types: {} };
			}

			// Get all keys we need to register (base + numbered history keys)
			const keysToRegister = new Set<string>();
			const maxDepth = 5; // Maximum history depth supported
			
			// Add base keys
			keysToRegister.add(this.settings.dateOpenedKey);
			keysToRegister.add(this.settings.dateClosedKey);
			keysToRegister.add(this.settings.lastViewKey);
			keysToRegister.add(this.settings.lastUnfocusKey);
			
			// Add numbered keys for history (e.g., last_opened_1, last_opened_2, etc.)
			for (let i = 1; i <= maxDepth; i++) {
				keysToRegister.add(`${this.settings.dateOpenedKey}_${i}`);
				keysToRegister.add(`${this.settings.dateClosedKey}_${i}`);
			}

			// Update or add all keys as datetime type
			let hasChanges = false;
			for (const key of keysToRegister) {
				if (typesData.types[key] !== 'datetime') {
					typesData.types[key] = 'datetime';
					hasChanges = true;
				}
			}

			// Only write if we made changes
			if (hasChanges) {
				const json = JSON.stringify(typesData, null, 2);
				await this.app.vault.adapter.write(typesPath, json);
			}
		} catch (error) {
			console.error('Failed to update types.json:', error);
			// Don't throw - this is a nice-to-have feature, not critical
		}
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
			// Determine per-file depth override: check frontmatter for `<property>_history` numeric value
			// Cap at 5 for memory management
			let depth = Math.min(5, Math.max(1, this.settings.historyDepth || 1));
			const overrideKey = `${property}_history`;
			const overrideVal = frontmatter[overrideKey];
			if (overrideVal !== undefined) {
				const maybeNum = typeof overrideVal === 'number' ? overrideVal : parseInt(String(overrideVal), 10);
				if (!Number.isNaN(maybeNum) && maybeNum >= 1) {
					depth = Math.min(5, maybeNum);
				}
			}
			if (depth === 1) {
				frontmatter[property] = timestamp;
				// Clean up any existing numbered keys for depth 1
				for (const key of Object.keys(frontmatter)) {
					const m = key.match(new RegExp(`^${property}_(\\d+)$`));
					if (m) {
						delete (frontmatter as Record<string, unknown>)[key];
					}
				}
				return;
			}

			// Shift numbered keys up: property_{depth} = property_{depth-1}, ..., property_2 = property_1
			for (let i = depth; i >= 2; i--) {
				const prevKey = i === 2 ? `${property}_1` : `${property}_${i - 1}`;
				const targetKey = `${property}_${i}`;
				if (prevKey in frontmatter) {
					(frontmatter as Record<string, unknown>)[targetKey] = (frontmatter as Record<string, unknown>)[prevKey];
				} else {
					delete (frontmatter as Record<string, unknown>)[targetKey];
				}
			}

			// Set newest
			(frontmatter as Record<string, unknown>)[`${property}_1`] = timestamp;

			// Always set base key to newest timestamp
			(frontmatter as Record<string, unknown>)[property] = timestamp;

			// Clean up any numbered keys beyond the configured depth
			for (const key of Object.keys(frontmatter)) {
				const m = key.match(new RegExp(`^${property}_(\\d+)$`));
				if (m) {
					const idx = parseInt(m[1], 10);
					if (idx > depth) {
						delete (frontmatter as Record<string, unknown>)[key];
					}
				}
			}
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
