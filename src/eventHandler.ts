/**
 * Event listener setup module
 *
 * This file registers all the plugin's event handlers.
 * Keeping this separate makes it clear what events we're listening to
 * and makes the code easier to understand and modify.
 *
 * For beginners: Events are things that happen in Obsidian - like opening a file
 * or closing the application. We "listen" for these and respond when they happen.
 */

import { Plugin, TFile } from 'obsidian';

/**
 * Interface for file handler operations needed by EventHandler
 * This allows using a temporary handler during initialization
 */
interface FileHandlerLike {
	updateDateOpened(file: TFile): Promise<void>;
	updateDateClosed(file: TFile): Promise<void>;
}

/**
 * EventHandler class organizes all event listener setup
 * Separation of concerns: this file only handles events, not timestamps or files
 */
export class EventHandler {
	private lastActiveFile: TFile | null = null;

	/**
	 * Track when each file was opened
	 * Key: file path, Value: opening timestamp
	 * This allows us to use the correct opening time when adding YAML keys later
	 */
	private fileOpeningTimes: Map<string, Date> = new Map();

	constructor(private plugin: Plugin, private fileHandler: FileHandlerLike) {}

	/**
	 * Update the file handler instance
	 * Used during initialization when the real file handler becomes available
	 */
	setFileHandler(fileHandler: FileHandlerLike): void {
		this.fileHandler = fileHandler;
	}

	/**
	 * Register all event listeners for the plugin
	 * Called once when the plugin loads
	 *
	 * This includes:
	 * - When a file is opened (file-open event)
	 * - When the application is about to close (beforeunload event)
	 */
	registerEvents(): void {
		// Register the file-open event
		// This fires when the user opens a note in Obsidian
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('file-open', (file: TFile | null) => {
				this.handleFileOpen(file);
			})
		);

		// Register for application shutdown
		// This ensures we update the "closed" timestamp even when quitting Obsidian
		this.plugin.app.workspace.onLayoutReady(() => {
			window.addEventListener('beforeunload', () => {
				this.handleApplicationClose();
			});
		});
	}

	/**
	 * Handler for when a file is opened
	 *
	 * Logic:
	 * 1. If there was a previously open file, mark it as closed
	 * 2. Record the opening time for the new file (for all files, not just tracked ones)
	 * 3. Update the newly opened file with an "opened" timestamp (if it has keys)
	 * 4. Remember this file so we can close it later
	 *
	 * @param file - The file that was just opened (null if no file is active)
	 *
	 * For beginners: Think of this as the "door opening" event.
	 * When someone opens a new door (file), we close the old one and record the new opening.
	 */
	private async handleFileOpen(file: TFile | null): Promise<void> {
		try {
			// Step 1: If there was a previous file and it's different from the new one, close it
			if (this.lastActiveFile && file !== this.lastActiveFile) {
				await this.fileHandler.updateDateClosed(this.lastActiveFile);
			}

			// Step 2: Record opening time for the new file (always, even if no keys)
			if (file) {
				this.fileOpeningTimes.set(file.path, new Date());
			}

			// Step 3: If a file is now open, record the opening time in YAML (if it has keys)
			if (file) {
				await this.fileHandler.updateDateOpened(file);
				this.lastActiveFile = file; // Remember this for later
			} else {
				// No file is open anymore
				this.lastActiveFile = null;
			}
		} catch (error) {
			console.error('Last Opened Plugin: Error handling file open', error);
		}
	}

	/**
	 * Get the opening time for a specific file
	 * Returns the time when this file was last opened, or null if unknown
	 *
	 * @param file - The file to get opening time for
	 * @returns The opening timestamp, or null if not tracked
	 *
	 * This is used when adding YAML keys to ensure we use the correct opening time
	 */
	getFileOpeningTime(file: TFile): Date | null {
		return this.fileOpeningTimes.get(file.path) || null;
	}

	/**
	 * Save opening times to persistent storage
	 * Called when the plugin unloads to preserve data across sessions
	 */
	async saveOpeningTimes(): Promise<void> {
		try {
			// Convert Map to object for JSON serialization
			const timesObject: Record<string, string> = {};
			for (const [path, date] of this.fileOpeningTimes) {
				timesObject[path] = date.toISOString();
			}
			await this.plugin.saveData({ openingTimes: timesObject });
		} catch (error) {
			console.error('Failed to save opening times:', error);
		}
	}

	/**
	 * Load opening times from persistent storage
	 * Called when the plugin loads to restore data from previous sessions
	 */
	async loadOpeningTimes(): Promise<void> {
		try {
			const data = await this.plugin.loadData();
			if (data?.openingTimes) {
				// Convert object back to Map
				this.fileOpeningTimes.clear();
				for (const [path, dateString] of Object.entries(data.openingTimes)) {
					this.fileOpeningTimes.set(path, new Date(dateString as string));
				}
			}
		} catch (error) {
			console.error('Failed to load opening times:', error);
		}
	}

	/**
	 * Clean up stale data from the opening times map
	 * Removes entries for deleted files and entries older than 48 hours
	 * Prevents memory leaks and keeps data relevant
	 */
	cleanupStaleData(): void {
		const now = new Date();
		const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000)); // 48 hours in milliseconds

		// Get current vault files for comparison
		const vaultFiles = new Set(
			this.plugin.app.vault.getMarkdownFiles().map(f => f.path)
		);

		// Remove entries that meet either criteria:
		// 1. File no longer exists in vault
		// 2. Opening time is older than 48 hours
		for (const [path, openingTime] of this.fileOpeningTimes) {
			const shouldRemove =
				!vaultFiles.has(path) ||  // File deleted/renamed
				openingTime < fortyEightHoursAgo;  // Too old

			if (shouldRemove) {
				this.fileOpeningTimes.delete(path);
			}
		}
	}

	/**
	 * Handler for when the application is closing
	 * Ensures we record the close time for the currently open file
	 *
	 * This is important for the accuracy of "date_last_closed"
	 * Even if the user force-closes Obsidian, we try to save the close timestamp
	 */
	private async handleApplicationClose(): Promise<void> {
		try {
			if (this.lastActiveFile) {
				await this.fileHandler.updateDateClosed(this.lastActiveFile);
			}
		} catch (error) {
			console.error(
				'Last Opened Plugin: Error handling application close',
				error
			);
		}
	}
}

/**
 * Factory function to create and register an EventHandler
 * Convenient shorthand for setting up events
 *
 * @param plugin - The plugin instance
 * @param fileHandler - File handler for updating frontmatter
 * @returns A configured and registered EventHandler
 */
export function setupEventHandlers(
	plugin: Plugin,
	fileHandler: FileHandlerLike
): EventHandler {
	const handler = new EventHandler(plugin, fileHandler);
	handler.registerEvents();
	return handler;
}
