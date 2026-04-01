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

	/** Unified timestamp mode that controls both format and timezone behavior */
	timestampMode: 'local-iso-offset' | 'utc-iso';

	/** Whether to track opening timestamps */
	trackOpened: boolean;

	/** Whether to track closing timestamps */
	trackClosed: boolean;

	/**
	 * @deprecated Legacy format field kept for migration compatibility.
	 * New code should use timestampMode.
	 */
	dateFormat?: 'YYYY-MM-DDTHH:mm:ssZ' | 'UTC';

	/**
	 * @deprecated Legacy timezone field kept for migration compatibility.
	 * New code should use timestampMode.
	 */
	timezone?: 'local' | 'utc' | string;

	/** How many historical entries to keep for each tracked key (1 = single value) */
	historyDepth: number;

	/** YAML key for unique IDs */
	uidKey: string;

	/** Length used when generating unique IDs */
	uidLength: number;

	/** Source extension for custom folder conversion */
	customExtFrom: string;

	/** Target extension for custom folder conversion */
	customExtTo: string;

	/** Folder recursion behavior for folder actions */
	folderRecursion: 'fully-recursive' | 'not-recursive' | 'ask' | 'depth';

	/** Depth used when folderRecursion = 'depth' */
	folderRecursionDepth: number;

	/** Show depth choice in ask modal */
	showRecursionDepthInAsk: boolean;

	/** Enable tracking for same-group tab focus changes */
	trackFocusChanges: boolean;

	/** YAML key for when a file gains focus in a tab group */
	lastViewKey: string;

	/** YAML key for when a file loses focus in a tab group */
	lastUnfocusKey: string;

	/** Show notice when UID is added or replaced */
	showUidNotice?: boolean;
}

type YamlKeySetting =
	| 'dateOpenedKey'
	| 'dateClosedKey'
	| 'uidKey'
	| 'lastViewKey'
	| 'lastUnfocusKey';

const YAML_KEY_SETTINGS: YamlKeySetting[] = [
	'dateOpenedKey',
	'dateClosedKey',
	'uidKey',
	'lastViewKey',
	'lastUnfocusKey'
];

function normalizeYamlKey(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function hasUniqueYamlKeys(settings: Pick<LastOpenedSettings, YamlKeySetting>): boolean {
	const seen = new Set<string>();

	for (const key of YAML_KEY_SETTINGS) {
		const normalized = normalizeYamlKey(settings[key]);
		if (!normalized || seen.has(normalized)) {
			return false;
		}

		seen.add(normalized);
	}

	return true;
}

/**
 * Default settings that apply when the user hasn't configured anything
 *
 * These defaults match what's described in the README.md
 * The local time format with offset (e.g., 2025-11-16T14:30:00-06:00) shows both local time and timezone
 */
export const DEFAULT_SETTINGS: LastOpenedSettings = {
	dateOpenedKey: 'last_opened',
	dateClosedKey: 'last_closed',
	timestampMode: 'local-iso-offset',
	trackOpened: true,
	trackClosed: true,
	historyDepth: 1,
	uidKey: 'uid',
	uidLength: 8,
	customExtFrom: 'md',
	customExtTo: 'txt',
	folderRecursion: 'not-recursive',
	folderRecursionDepth: 1,
	showRecursionDepthInAsk: false,
	trackFocusChanges: false,
	lastViewKey: 'last_view',
	lastUnfocusKey: 'last_unfocus'
	, showUidNotice: true
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
		'timestampMode',
		'trackOpened',
		'trackClosed',
		'historyDepth',
		'uidKey',
		'uidLength',
		'customExtFrom',
		'customExtTo',
		'folderRecursion',
		'folderRecursionDepth',
		'showRecursionDepthInAsk',
		'trackFocusChanges',
		'lastViewKey',
		'lastUnfocusKey'
	];

	if (!requiredKeys.every(key => key in settings)) {
		return false;
	}

	// Additional type checks
	const s = settings as Record<string, unknown>;
	if (typeof s.historyDepth !== 'number' || s.historyDepth < 1 || s.historyDepth > 5) {
		return false;
	}

	if (typeof s.uidLength !== 'number' || s.uidLength < 4 || s.uidLength > 32) {
		return false;
	}

	if (typeof s.folderRecursionDepth !== 'number' || s.folderRecursionDepth < 1 || s.folderRecursionDepth > 10) {
		return false;
	}

	const allowedRecursion = ['fully-recursive', 'not-recursive', 'ask', 'depth'];
	if (!allowedRecursion.includes(s.folderRecursion as string)) {
		return false;
	}

	if (typeof s.showRecursionDepthInAsk !== 'boolean') {
		return false;
	}

	if (typeof s.trackFocusChanges !== 'boolean') {
		return false;
	}

	if (
		typeof s.dateOpenedKey !== 'string' ||
		typeof s.dateClosedKey !== 'string' ||
		typeof s.uidKey !== 'string' ||
		typeof s.uidLength !== 'number' ||
		typeof s.customExtFrom !== 'string' ||
		typeof s.customExtTo !== 'string' ||
		typeof s.lastViewKey !== 'string' ||
		typeof s.lastUnfocusKey !== 'string'
	) {
		return false;
	}

	if (!hasUniqueYamlKeys(s as Pick<LastOpenedSettings, YamlKeySetting>)) {
		return false;
	}

	const allowedTimestampModes = ['local-iso-offset', 'utc-iso'];
	if (!allowedTimestampModes.includes(s.timestampMode as string)) {
		return false;
	}

	return true;
}