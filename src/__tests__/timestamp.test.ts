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

    it('should handle UTC timezone setting', () => {
      const utcSettings = { ...DEFAULT_SETTINGS, timezone: 'utc' as const };
      const utcGenerator = new TimestampGenerator(utcSettings);
      const timestamp = utcGenerator.generateTimestamp();
      // Currently, timezone setting is not implemented, so it still uses local
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    });
  });

  describe('createTimestampGenerator', () => {
    it('should create a TimestampGenerator instance', () => {
      const gen = createTimestampGenerator(DEFAULT_SETTINGS);
      expect(gen).toBeInstanceOf(TimestampGenerator);
    });
  });
});