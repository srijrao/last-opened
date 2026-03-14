import { TimestampGenerator, createTimestampGenerator } from '../timestamp';
import { DEFAULT_SETTINGS } from '../settings';

describe('TimestampGenerator', () => {
  let generator: TimestampGenerator;

  beforeEach(() => {
    generator = new TimestampGenerator(DEFAULT_SETTINGS);
  });

  describe('generateTimestamp', () => {
    it('should generate timestamp in ISO format with offset', () => {
      const timestamp = generator.generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    });

    it('should generate timestamp for specific date', () => {
      const testDate = new Date('2023-11-14T10:30:45');
      const timestamp = generator.generateTimestamp(testDate);
      // Just check that it contains the date parts, not exact time due to timezone
      expect(timestamp).toMatch(/2023-11-14T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    });

    it('should use local time components for local-iso-offset mode', () => {
      // Create a specific date
      const testDate = new Date('2025-11-17T08:21:08.000Z'); // UTC time
      const timestamp = generator.generateTimestamp(testDate);
      
      // Extract time components from timestamp
      const timeMatch = timestamp.match(/T(\d{2}):(\d{2}):(\d{2})/);
      expect(timeMatch).toBeTruthy();
      
      const [, hours, minutes, seconds] = timeMatch!;
      const timestampHours = parseInt(hours, 10);
      const timestampMinutes = parseInt(minutes, 10);
      const timestampSeconds = parseInt(seconds, 10);
      
      // The timestamp should show local time, not UTC.
      // Since testDate is 08:21:08 UTC, local values come from Date local getters.
      const localHours = testDate.getHours();
      const localMinutes = testDate.getMinutes();
      const localSeconds = testDate.getSeconds();
      
      expect(timestampHours).toBe(localHours);
      expect(timestampMinutes).toBe(localMinutes);
      expect(timestampSeconds).toBe(localSeconds);
    });

    it('should handle utc-iso mode', () => {
      const utcSettings = { ...DEFAULT_SETTINGS, timestampMode: 'utc-iso' as const };
      const utcGenerator = new TimestampGenerator(utcSettings);
      const timestamp = utcGenerator.generateTimestamp();
      // Should use Z for UTC mode
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('createTimestampGenerator', () => {
    it('should create a TimestampGenerator instance', () => {
      const gen = createTimestampGenerator(DEFAULT_SETTINGS);
      expect(gen).toBeInstanceOf(TimestampGenerator);
    });
  });
});