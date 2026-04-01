/**
 * Timestamp generation module
 *
 * This file handles creating properly formatted timestamps for the frontmatter.
 * It supports multiple formats and timezones to give users flexibility.
 *
 * For beginners: This is like a "time formatter" - it takes the current moment
 * and turns it into a readable string according to user preferences.
 */

import { LastOpenedSettings } from './settings';

/**
 * TimestampGenerator class encapsulates all timestamp creation logic
 * Using a class makes it easy to pass settings around and test independently
 */
export class TimestampGenerator {
	/**
	 * Constructor takes the current settings
	 * @param settings - Plugin settings containing format and timezone preferences
	 */
	constructor(private settings: LastOpenedSettings) { }

	/**
	 * Generates a timestamp string for the current moment
	 * Respects the user's format and timezone settings
	 *
	 * @param date - Optional Date object to format (defaults to current time)
	 * @returns Formatted timestamp string (e.g., "2025-11-14 15:30:45")
	 *
	 * Example for beginners:
	 * If it's 3:30 PM and the user wants local datetime format,
	 * this returns something like "2025-11-14 15:30:45"
	 * This format is commonly recognized as datetime in various systems.
	 *
	 * You can also pass a specific date: generateTimestamp(somePastDate)
	 */
	generateTimestamp(date?: Date): string {
		const targetDate = date || new Date();
		const timestampMode = this.resolveTimestampMode();

		switch (timestampMode) {
			// ISO 8601 with local timezone offset (standard, preserves timezone, widely recognized)
			case 'local-iso-offset':
				return this.toISO8601WithOffset(targetDate);

			// UTC format (good for standardization)
			case 'utc-iso':
				return targetDate.toISOString();
		}
	}

	/**
	 * Resolve timestamp mode from current settings.
	 * Falls back to legacy dateFormat/timezone if needed for migration safety.
	 */
	private resolveTimestampMode(): 'local-iso-offset' | 'utc-iso' {
		if (this.settings.timestampMode === 'local-iso-offset' || this.settings.timestampMode === 'utc-iso') {
			return this.settings.timestampMode;
		}

		if (this.settings.dateFormat === 'UTC' || this.settings.timezone === 'utc') {
			return 'utc-iso';
		}

		return 'local-iso-offset';
	}

	/**
	 * Helper: Convert date to ISO 8601 format with local timezone offset (or UTC with Z)
	 * Format: 2025-11-14T15:30:45-05:00 or 2025-11-14T20:30:45Z
	 *
	 * @param date - JavaScript Date object
	 * @returns ISO 8601 string with timezone info
	 *
	 * Uses Z for UTC or offset for local time based on settings.
	 */
	private toISO8601WithOffset(date: Date): string {
		// Use local time components directly (Date.getHours() returns local time)
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		// Calculate offset (e.g., "-05:00" for EST)
		const offsetMinutes = -date.getTimezoneOffset();
		const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
		const offsetMins = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';
		const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
	}
}

/**
 * Utility function to get a timestamp generator with current settings
 * This is a shorthand so you don't have to construct the class everywhere
 *
 * @param settings - Plugin settings
 * @returns A new TimestampGenerator instance
 */
export function createTimestampGenerator(
	settings: LastOpenedSettings
): TimestampGenerator {
	return new TimestampGenerator(settings);
}
