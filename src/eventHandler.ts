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

	/**
	 * Track which files are currently open in the workspace
	 * Used to detect actual file openings and closings, not just focus changes
	 */
	private currentlyOpenFiles: Set<string> = new Set();

	constructor(private plugin: Plugin, private fileHandler: FileHandlerLike) {}

	/**
	 * Update the file handler instance
	 * Used during initialization when the real file handler becomes available
	 */
	setFileHandler(fileHandler: FileHandlerLike): void {
		this.fileHandler = fileHandler;
	}

	/**
	 * Get the file handler instance
	 * Used when settings change to update types.json
	 */
	getFileHandler(): FileHandlerLike {
		return this.fileHandler;
	}

	/**
	 * Register all event listeners for the plugin
	 * Called once when the plugin loads
	 *
	 * This includes:
	 * - When the layout changes (files opened/closed)
	 * - When the application is about to close (beforeunload event)
	 */
	registerEvents(): void {
		// Register the layout-change event
		// This fires when the workspace layout changes, such as when files are opened or closed
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => {
				this.handleLayoutChange();
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
	 * Handler for when the workspace layout changes
	 *
	 * Logic:
	 * 1. Get the current set of open files from all leaves
	 * 2. Compare with previously known open files
	 * 3. Record opening timestamps for newly opened files
	 * 4. Record closing timestamps for newly closed files
	 * 5. Update the tracked set of open files
	 *
	 * This ensures we only record actual file openings and closings,
	 * not focus changes between already open files.
	 */
	private async handleLayoutChange(): Promise<void> {
		try {
			// Get currently open files from all workspace leaves
			const currentOpenFiles = new Set<string>();
			this.plugin.app.workspace.iterateAllLeaves((leaf) => {
				const file = leaf.view.getState().file;
				if (file && typeof file === 'string') {
					currentOpenFiles.add(file);
				}
			});

			// Find files that were opened (in current but not in previous)
			const newlyOpened = new Set(
				[...currentOpenFiles].filter(file => !this.currentlyOpenFiles.has(file))
			);

			// Find files that were closed (in previous but not in current)
			const newlyClosed = new Set(
				[...this.currentlyOpenFiles].filter(file => !currentOpenFiles.has(file))
			);

			// Record opening times and update frontmatter for newly opened files
			for (const filePath of newlyOpened) {
				const file = this.plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
				if (file && file instanceof TFile) {
					this.fileOpeningTimes.set(filePath, new Date());
					await this.fileHandler.updateDateOpened(file);
				}
			}

			// Record closing times for newly closed files
			for (const filePath of newlyClosed) {
				const file = this.plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
				if (file && file instanceof TFile) {
					await this.fileHandler.updateDateClosed(file);
				}
			}

			// Update the tracked set of open files
			this.currentlyOpenFiles = currentOpenFiles;
		} catch (error) {
			console.error('Last Opened Plugin: Error handling layout change', error);
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
	 * Ensures we record the close time for all currently open files
	 *
	 * This is important for the accuracy of "date_last_closed"
	 * Even if the user force-closes Obsidian, we try to save the close timestamps
	 */
	private async handleApplicationClose(): Promise<void> {
		try {
			for (const filePath of this.currentlyOpenFiles) {
				const file = this.plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
				if (file && file instanceof TFile) {
					await this.fileHandler.updateDateClosed(file);
				}
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
