/**
 * Main plugin file for Last Opened Plugin
 *
 * This file is the entry point for the plugin. It coordinates initialization
 * and bootstraps all the other modules (settings, timestamps, file handling, events, commands).
 *
 * Architecture overview for beginners:
 * main.ts (this file) is like the "conductor" that brings together all the
 * other modules and makes them work together. The actual logic lives in
 * separate files so each one has a single responsibility and is easier to understand.
 *
 * The Plugin class extends Obsidian's Plugin base class and provides
 * access to Obsidian's API (like the file manager and workspace).
 */

import { Plugin, PluginSettingTab, Setting, App, TFile } from 'obsidian';
import {
	LastOpenedSettings,
	DEFAULT_SETTINGS,
	validateSettings
} from './settings';
import { createTimestampGenerator } from './timestamp';
import { createFileHandler, FileHandler } from './fileHandler';
import { EventHandler } from './eventHandler';
import { setupCommands } from './commands';
import { UidHandler } from './uidHandler';
import { ExtensionHandler } from './extensionHandler';
import { registerFileExplorerMenus } from './contextMenus';

/**
 * Temporary file handler interface for initialization
 * Used before the real FileHandler is available
 */
interface TempFileHandler {
	updateDateOpened: (file: TFile) => Promise<void>;
	updateDateClosed: (file: TFile) => Promise<void>;
	updateLastView: (file: TFile) => Promise<void>;
	updateLastUnfocus: (file: TFile) => Promise<void>;
}

/**
 * LastOpenedPlugin - The main plugin class
 *
 * This is the entry point for Obsidian. The onload() method is called
 * when the plugin starts, and onunload() is called when it stops.
 *
 * For beginners: Think of this like the "main" function in other programs.
 * It's where everything gets set up.
 */
export default class LastOpenedPlugin extends Plugin {
	/** Stores the current plugin settings */
	settings: LastOpenedSettings;

	/** Event handler instance for managing file events */
	private eventHandler: EventHandler | null = null;

	/** File handler instance for file operations */
	private fileHandler: FileHandler | null = null;

	/**
	 * onload() is called when Obsidian loads the plugin
	 * This is where we initialize everything
	 */
	async onload(): Promise<void> {
		// Step 1: Load settings from persistent storage
		await this.loadSettings();

		// Step 2: Create our helper objects
		// These are "dependencies" - objects that other objects need to work
		const timestampGenerator = createTimestampGenerator(this.settings);

		// Step 3: Create a temporary fileHandler for the eventHandler (will be replaced)
		const tempFileHandler: TempFileHandler = {
			updateDateOpened: () => Promise.resolve(),
			updateDateClosed: () => Promise.resolve(),
			updateLastView: () => Promise.resolve(),
			updateLastUnfocus: () => Promise.resolve()
		};

		// Step 4: Create event handler
		const eventHandler = new EventHandler(this, tempFileHandler);
		this.eventHandler = eventHandler;

		// Step 5: Create the real file handler with the event handler
		const fileHandler = createFileHandler(
			this.app,
			this.settings,
			timestampGenerator,
			eventHandler
		);
		this.fileHandler = fileHandler;

		// Step 6: Update the event handler to use the real file handler
		eventHandler.setFileHandler(fileHandler);

		// Step 7: Set up event listeners (what to do when files open/close)
		eventHandler.registerEvents();

		// Step 8: Load persisted opening times and clean up
		await eventHandler.loadOpeningTimes();
		eventHandler.cleanupStaleData();

		// Step 9: Register user commands (what users can do via command palette)
		const uidHandler = new UidHandler(this.app, this.settings);
		const extensionHandler = new ExtensionHandler(this.app, this.settings);
		setupCommands(this, fileHandler, uidHandler);
		registerFileExplorerMenus(this, extensionHandler);

		// Step 10: Add settings tab
		this.addSettingTab(new LastOpenedSettingTab(this.app, this));

		// Step 11: Update types.json to register our datetime properties
		await fileHandler.updateTypesJson();

		console.log('Last Opened Plugin loaded');
	}

	/**
	 * onunload() is called when the plugin is disabled or Obsidian closes
	 * Save opening times to persist across sessions
	 */
	async onunload(): Promise<void> {
		// Save opening times before unloading
		if (this.eventHandler) {
			this.eventHandler.cleanupGlobalListeners();
			await this.eventHandler.saveOpeningTimes();
		}
		console.log('Last Opened Plugin unloaded');
	}

	/**
	 * Load settings from Obsidian's plugin storage
	 * Merges stored settings with defaults so missing keys use defaults
	 *
	 * For beginners: Obsidian stores plugin data as JSON in a hidden directory.
	 * This method reads that data and combines it with our defaults.
	 */
	private async loadSettings(): Promise<void> {
		// Get stored data (or empty object if no data exists)
		const storedData = await this.loadData();

		// Merge: use stored values, fall back to defaults for missing keys
		this.settings = Object.assign({}, DEFAULT_SETTINGS, storedData);

		// Validate settings in case they got corrupted somehow
		if (!validateSettings(this.settings)) {
			console.warn(
				'Settings validation failed, using defaults. Stored data:',
				storedData
			);
			this.settings = DEFAULT_SETTINGS;
		}
	}

	/**
	 * Save settings to Obsidian's plugin storage
	 * This persists the settings so they survive app restarts
	 * Also updates types.json when settings change
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update types.json when settings change (e.g., key names changed)
		if (this.fileHandler) {
			await this.fileHandler.updateTypesJson();
		}
	}
}

/**
 * Settings tab for configuring the Last Opened plugin
 * Provides a UI for users to customize YAML keys, time formats, and tracking options
 */
class LastOpenedSettingTab extends PluginSettingTab {
	plugin: LastOpenedPlugin;

	constructor(app: App, plugin: LastOpenedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		let timezoneSetting: Setting | null = null;

		containerEl.createEl('h2', { text: 'Last Opened Plugin Settings' });

		// YAML Keys section
		containerEl.createEl('h3', { text: 'YAML Keys' });

		new Setting(containerEl)
			.setName('Opened Key')
			.setDesc('YAML key name for tracking when notes are opened')
			.addText(text => text
				.setPlaceholder('last_opened')
				.setValue(this.plugin.settings.dateOpenedKey)
				.onChange(async (value) => {
					// Handle empty values gracefully - use defaults
					const trimmed = value.trim();
					const finalValue = trimmed || 'last_opened'; // Default if empty

					// Check for duplicate keys (only if both are non-empty)
					if (finalValue && finalValue === this.plugin.settings.dateClosedKey) {
						text.inputEl.style.borderColor = 'orange';
						text.inputEl.title = 'Opened and closed keys should be different';
					} else {
						text.inputEl.style.borderColor = '';
						text.inputEl.title = '';
					}

					this.plugin.settings.dateOpenedKey = finalValue;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Closed Key')
			.setDesc('YAML key name for tracking when notes are closed')
			.addText(text => text
				.setPlaceholder('last_closed')
				.setValue(this.plugin.settings.dateClosedKey)
				.onChange(async (value) => {
					// Handle empty values gracefully - use defaults
					const trimmed = value.trim();
					const finalValue = trimmed || 'last_closed'; // Default if empty

					// Check for duplicate keys (only if both are non-empty)
					if (finalValue && finalValue === this.plugin.settings.dateOpenedKey) {
						text.inputEl.style.borderColor = 'orange';
						text.inputEl.title = 'Opened and closed keys should be different';
					} else {
						text.inputEl.style.borderColor = '';
						text.inputEl.title = '';
					}

					this.plugin.settings.dateClosedKey = finalValue;
					await this.plugin.saveSettings();
				}));

		// Time Format section
		containerEl.createEl('h3', { text: 'Time Format' });

		const syncTimezoneSettingState = (): void => {
			if (!timezoneSetting) {
				return;
			}

			const utcFormatSelected = this.plugin.settings.dateFormat === 'UTC';
			timezoneSetting.setDesc(
				utcFormatSelected
					? 'Timezone is locked to UTC when Date Format is set to UTC'
					: 'Timezone used for ISO 8601 with offset format'
			);

			if (utcFormatSelected) {
				timezoneSetting.components.forEach(component => {
					component.setDisabled(true);
				});
			} else {
				timezoneSetting.components.forEach(component => {
					component.setDisabled(false);
				});
			}
		};

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Timestamp output format')
			.addDropdown(dropdown => dropdown
				.addOption('YYYY-MM-DDTHH:mm:ssZ', 'ISO 8601 with timezone from setting below')
				.addOption('UTC', 'Force UTC ISO output (timezone setting is ignored)')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value: 'YYYY-MM-DDTHH:mm:ssZ' | 'UTC') => {
					this.plugin.settings.dateFormat = value;

					if (value === 'UTC') {
						this.plugin.settings.timezone = 'utc';
					}

					await this.plugin.saveSettings();
					syncTimezoneSettingState();
				}));

		timezoneSetting = new Setting(containerEl)
			.setName('Timezone')
			.setDesc('Timezone used for ISO 8601 with offset format')
			.addDropdown(dropdown => dropdown
				.addOption('local', 'Use local clock time with UTC offset')
				.addOption('utc', 'Use UTC clock time')
				.setValue(this.plugin.settings.timezone)
				.onChange(async (value: 'local' | 'utc') => {
					if (this.plugin.settings.dateFormat === 'UTC') {
						dropdown.setValue('utc');
						return;
					}

					this.plugin.settings.timezone = value;
					await this.plugin.saveSettings();
				}));

		syncTimezoneSettingState();

		// Tracking Options section
		containerEl.createEl('h3', { text: 'Tracking Options' });

		new Setting(containerEl)
			.setName('Track Openings')
			.setDesc('Record timestamps when notes are opened')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.trackOpened)
				.onChange(async (value) => {
					this.plugin.settings.trackOpened = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Track Closings')
			.setDesc('Record timestamps when notes are closed')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.trackClosed)
				.onChange(async (value) => {
					this.plugin.settings.trackClosed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Track Focus Changes')
			.setDesc('Track last_view and last_unfocus when switching tabs within the same tab group')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.trackFocusChanges)
				.onChange(async (value) => {
					this.plugin.settings.trackFocusChanges = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Last View Key')
			.setDesc('YAML key for the most recent in-group focused view timestamp')
			.addText(text => text
				.setPlaceholder('last_view')
				.setValue(this.plugin.settings.lastViewKey)
				.onChange(async (value) => {
					this.plugin.settings.lastViewKey = value.trim() || 'last_view';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Last Unfocus Key')
			.setDesc('YAML key for when a note loses focus in the same tab group')
			.addText(text => text
				.setPlaceholder('last_unfocus')
				.setValue(this.plugin.settings.lastUnfocusKey)
				.onChange(async (value) => {
					this.plugin.settings.lastUnfocusKey = value.trim() || 'last_unfocus';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('History Depth')
			.setDesc('How many past timestamps to keep for each key (1-5)')
			.addSlider(slider => slider
				.setLimits(1, 5, 1)
				.setValue(this.plugin.settings.historyDepth)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.historyDepth = value;
					await this.plugin.saveSettings();
				}));

		// Unique ID section
		containerEl.createEl('h3', { text: 'Unique ID' });

		new Setting(containerEl)
			.setName('UID Key')
			.setDesc('YAML key name for generated unique IDs')
			.addText(text => text
				.setPlaceholder('uid')
				.setValue(this.plugin.settings.uidKey)
				.onChange(async (value) => {
					const trimmed = value.trim();
					this.plugin.settings.uidKey = trimmed || 'uid';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('UID Length')
			.setDesc('Length for generated unique IDs (4-32 characters)')
			.addSlider(slider => slider
				.setLimits(4, 32, 1)
				.setValue(this.plugin.settings.uidLength)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.uidLength = value;
					await this.plugin.saveSettings();
				}));

		// File extension section
		containerEl.createEl('h3', { text: 'File Extensions' });

		new Setting(containerEl)
			.setName('Custom Convert From')
			.setDesc('Source extension for custom folder conversion (without dot)')
			.addText(text => text
				.setPlaceholder('md')
				.setValue(this.plugin.settings.customExtFrom)
				.onChange(async (value) => {
					this.plugin.settings.customExtFrom = value.replace(/^\./, '').trim().toLowerCase() || 'md';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom Convert To')
			.setDesc('Target extension for custom folder conversion (without dot)')
			.addText(text => text
				.setPlaceholder('txt')
				.setValue(this.plugin.settings.customExtTo)
				.onChange(async (value) => {
					this.plugin.settings.customExtTo = value.replace(/^\./, '').trim().toLowerCase() || 'txt';
					await this.plugin.saveSettings();
				}));

		// Folder operation section
		containerEl.createEl('h3', { text: 'Folder Operations' });

		new Setting(containerEl)
			.setName('Folder Recursion')
			.setDesc('How folder actions should recurse through subfolders')
			.addDropdown(dropdown => dropdown
				.addOption('not-recursive', 'Only this folder')
				.addOption('fully-recursive', 'Fully recursive')
				.addOption('ask', 'Ask each time')
				.addOption('depth', 'Recursive to X level')
				.setValue(this.plugin.settings.folderRecursion)
				.onChange(async (value: 'not-recursive' | 'fully-recursive' | 'ask' | 'depth') => {
					this.plugin.settings.folderRecursion = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Folder Recursion Depth')
			.setDesc('Depth used when mode is Recursive to X level or Ask includes depth')
			.addSlider(slider => slider
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.folderRecursionDepth)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.folderRecursionDepth = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Depth Option In Ask')
			.setDesc('Include Recursive to X level in the Ask dialog')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRecursionDepthInAsk)
				.onChange(async (value) => {
					this.plugin.settings.showRecursionDepthInAsk = value;
					await this.plugin.saveSettings();
				}));

		// Reset to defaults section
		containerEl.createEl('h3', { text: 'Reset Settings' });

		new Setting(containerEl)
			.setName('Reset to Defaults')
			.setDesc('Reset all settings to their default values')
			.addButton(button => button
				.setButtonText('Reset')
				.setWarning()
				.onClick(async () => {
					// Reset settings to defaults
					this.plugin.settings = { ...DEFAULT_SETTINGS };
					await this.plugin.saveSettings();
					// Refresh the settings display
					this.display();
				}));
	}
}
