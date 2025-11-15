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

		switch (this.settings.dateFormat) {
			// ISO 8601 with local timezone offset (standard, preserves timezone, widely recognized)
			case 'YYYY-MM-DDTHH:mm:ssZ':
				return this.toISO8601WithOffset(targetDate);

			// Local datetime with timezone offset (readable alternative)
			case 'YYYY-MM-DD HH:mm:ssZ':
				return this.toLocalDateTimeWithOffset(targetDate);

			// ISO 8601 formats (very standard, used across the web)
			case 'YYYY-MM-DDTHH:mm:ss':
				return this.toISO8601Local(targetDate);

			// UTC format (good for standardization)
			case 'UTC':
				return targetDate.toISOString();

			// Fallback to ISO 8601 with offset if user has custom format
			default:
				return this.toISO8601WithOffset(targetDate);
		}
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
		// If timezone is set to UTC, return ISO string with Z
		if (this.settings.timezone === 'utc') {
			return date.toISOString();
		}

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

	/**
	 * Helper: Convert date to local datetime format with timezone offset (or UTC)
	 * Format: 2025-11-14 15:30:45-06:00 or 2025-11-14 20:30:45Z
	 *
	 * @param date - JavaScript Date object
	 * @returns Local datetime string with timezone info
	 *
	 * This format is human-readable, includes timezone info, and commonly
	 * auto-recognized as datetime in systems like Obsidian's property system.
	 */
	private toLocalDateTimeWithOffset(date: Date): string {
		// If timezone is set to UTC, return UTC datetime with Z
		if (this.settings.timezone === 'utc') {
			const utcString = date.toISOString();
			// Convert to format like 2025-11-14 20:30:45Z
			const utcDate = new Date(utcString);
			const year = utcDate.getUTCFullYear();
			const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
			const day = String(utcDate.getUTCDate()).padStart(2, '0');
			const hours = String(utcDate.getUTCHours()).padStart(2, '0');
			const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
			const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0');
			return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}Z`;
		}

		const offsetMs = date.getTimezoneOffset() * 60000;
		const localDate = new Date(date.getTime() - offsetMs);

		// Format local time
		const year = localDate.getFullYear();
		const month = String(localDate.getMonth() + 1).padStart(2, '0');
		const day = String(localDate.getDate()).padStart(2, '0');
		const hours = String(localDate.getHours()).padStart(2, '0');
		const minutes = String(localDate.getMinutes()).padStart(2, '0');
		const seconds = String(localDate.getSeconds()).padStart(2, '0');

		// Calculate offset (e.g., "-06:00" for CDT)
		const offsetMinutes = -date.getTimezoneOffset();
		const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
		const offsetMins = Math.abs(offsetMinutes) % 60;
		const sign = offsetMinutes >= 0 ? '+' : '-';
		const offset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offset}`;
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
