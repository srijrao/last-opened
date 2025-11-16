/**
 * Settings for the Last Opened Plugin
 *
 * This file defines the configuration interface and default values for the plugin.
 * Settings are stored persistently in Obsidian's plugin data storage.
 *
 * For beginners: Think of this as a "recipe" that describes what settings the plugin needs.
 * The interface defines the shape of settings, and DEFAULT_SETTINGS provides sensible defaults.
 */

/**
 * Interface that defines all possible settings for the Last Opened plugin
 *
 * @interface LastOpenedSettings
 */
export interface LastOpenedSettings {
	/** YAML key name for tracking when a note was opened */
	dateOpenedKey: string;

	/** YAML key name for tracking when a note was closed */
	dateClosedKey: string;

	/** Format string for timestamps (using moment.js format) */
	dateFormat: string;

	/** Whether to track opening timestamps */
	trackOpened: boolean;

	/** Whether to track closing timestamps */
	trackClosed: boolean;

	/**
	 * Timezone setting for timestamps
	 * 'local' = local time with UTC offset (default)
	 * 'utc' = UTC/GMT time
	 * IANA timezone names like 'America/New_York' are also supported
	 */
	timezone: 'local' | 'utc' | string;
	
	/** How many historical entries to keep for each tracked key (1 = single value) */
	historyDepth: number;
}

/**
 * Default settings that apply when the user hasn't configured anything
 *
 * These defaults match what's described in the README.md
 * The ISO 8601 format with local offset provides good readability, timezone info, and compatibility
 */
export const DEFAULT_SETTINGS: LastOpenedSettings = {
	dateOpenedKey: 'date_last_opened',
	dateClosedKey: 'date_last_closed',
	dateFormat: 'YYYY-MM-DDTHH:mm:ssZ', // ISO 8601 with local timezone offset
	trackOpened: true,
	trackClosed: true,
	timezone: 'local',
	historyDepth: 1
};

/**
 * Validates that settings have required keys and sensible values
 * This is useful for catching corrupted or incomplete settings from storage
 *
 * @param settings - Settings object to validate
 * @returns true if settings are valid, false otherwise
 *
 * Example for beginners:
 * If someone deletes the 'dateOpenedKey' from settings somehow,
 * this function would catch it and let us handle it gracefully
 */
export function validateSettings(settings: unknown): boolean {
	// Check that settings is an object and has all required properties
	if (!settings || typeof settings !== 'object') {
		return false;
	}

	const requiredKeys: (keyof LastOpenedSettings)[] = [
		'dateOpenedKey',
		'dateClosedKey',
		'dateFormat',
		'trackOpened',
		'trackClosed',
		'timezone',
		'historyDepth'
	];

	if (!requiredKeys.every(key => key in settings)) {
		return false;
	}

	// Additional type checks
	const s = settings as Record<string, unknown>;
	if (typeof s.historyDepth !== 'number' || s.historyDepth < 1 || s.historyDepth > 5) {
		return false;
	}

	return true;
}