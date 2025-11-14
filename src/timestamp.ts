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
	constructor(private settings: LastOpenedSettings) {}

	/**
	 * Generates a timestamp string for the current moment
	 * Respects the user's format and timezone settings
	 *
	 * @param date - Optional Date object to format (defaults to current time)
	 * @returns Formatted timestamp string (e.g., "2025-11-14T10:30:45-05:00")
	 *
	 * Example for beginners:
	 * If it's 3:30 PM and the user wants ISO 8601 format in their local timezone,
	 * this returns something like "2025-11-14T15:30:45-05:00"
	 * The "-05:00" part tells us it's 5 hours behind UTC.
	 *
	 * You can also pass a specific date: generateTimestamp(somePastDate)
	 */
	generateTimestamp(date?: Date): string {
		const targetDate = date || new Date();

		switch (this.settings.dateFormat) {
			// ISO 8601 formats (very standard, used across the web)
			case 'YYYY-MM-DDTHH:mm:ssZ':
				return this.toISO8601WithOffset(targetDate);
			case 'YYYY-MM-DDTHH:mm:ss':
				return this.toISO8601Local(targetDate);

			// UTC format (good for standardization)
			case 'UTC':
				return targetDate.toISOString();

			// Fallback to a reasonable default if user has custom format
			default:
				return this.toISO8601WithOffset(targetDate);
		}
	}

	/**
	 * Helper: Convert date to ISO 8601 format with local timezone offset
	 * Format: 2025-11-14T15:30:45-05:00
	 *
	 * @param date - JavaScript Date object
	 * @returns ISO 8601 string with local timezone offset
	 *
	 * Why this format? It's readable AND includes timezone info,
	 * so you know exactly when it was in the local context.
	 */
	private toISO8601WithOffset(date: Date): string {
		const offsetMs = date.getTimezoneOffset() * 60000;
		const localDate = new Date(date.getTime() - offsetMs);

		// Format local time
		const year = localDate.getFullYear();
		const month = String(localDate.getMonth() + 1).padStart(2, '0');
		const day = String(localDate.getDate()).padStart(2, '0');
		const hours = String(localDate.getHours()).padStart(2, '0');
		const minutes = String(localDate.getMinutes()).padStart(2, '0');
		const seconds = String(localDate.getSeconds()).padStart(2, '0');

		// Calculate offset (e.g., "-05:00" for EST)
		const offsetMinutes = -date.getTimezoneOffset();
		const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
		const offsetMins = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';
		const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
	}

	/**
	 * Helper: Convert date to ISO 8601 format WITHOUT timezone info
	 * Format: 2025-11-14T15:30:45
	 *
	 * @param date - JavaScript Date object
	 * @returns ISO 8601 string in local time (no offset)
	 *
	 * This is simpler but you lose timezone context. Good if your vault
	 * is always used in the same timezone.
	 */
	private toISO8601Local(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
