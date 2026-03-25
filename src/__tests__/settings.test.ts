import { hasUniqueYamlKeys, validateSettings, DEFAULT_SETTINGS } from '../settings';

describe('Settings', () => {
  describe('validateSettings', () => {
    it('should return true for valid settings', () => {
      const validSettings = { ...DEFAULT_SETTINGS };
      expect(validateSettings(validSettings)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateSettings(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateSettings('string')).toBe(false);
      expect(validateSettings(123)).toBe(false);
    });

    it('should return false if missing required keys', () => {
      const invalidSettings = { ...DEFAULT_SETTINGS };
      delete (invalidSettings as Record<string, unknown>).dateOpenedKey;
      expect(validateSettings(invalidSettings)).toBe(false);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('dateOpenedKey');
      expect(DEFAULT_SETTINGS).toHaveProperty('dateClosedKey');
      expect(DEFAULT_SETTINGS).toHaveProperty('timestampMode');
      expect(DEFAULT_SETTINGS).toHaveProperty('trackOpened');
      expect(DEFAULT_SETTINGS).toHaveProperty('trackClosed');
      expect(DEFAULT_SETTINGS).toHaveProperty('trackFocusChanges');
      expect(DEFAULT_SETTINGS).toHaveProperty('lastViewKey');
      expect(DEFAULT_SETTINGS).toHaveProperty('lastUnfocusKey');
      expect(DEFAULT_SETTINGS).toHaveProperty('uidLength');
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_SETTINGS.dateOpenedKey).toBe('last_opened');
      expect(DEFAULT_SETTINGS.dateClosedKey).toBe('last_closed');
      expect(DEFAULT_SETTINGS.timestampMode).toBe('local-iso-offset');
      expect(DEFAULT_SETTINGS.trackOpened).toBe(true);
      expect(DEFAULT_SETTINGS.trackClosed).toBe(true);
      expect(DEFAULT_SETTINGS.uidLength).toBe(8);
      expect(DEFAULT_SETTINGS.trackFocusChanges).toBe(false);
      expect(DEFAULT_SETTINGS.lastViewKey).toBe('last_view');
      expect(DEFAULT_SETTINGS.lastUnfocusKey).toBe('last_unfocus');
    });

    it('should reject invalid UID length', () => {
      const invalidSettings = { ...DEFAULT_SETTINGS, uidLength: 2 };
      expect(validateSettings(invalidSettings)).toBe(false);
    });

    it('should reject duplicate YAML keys', () => {
      const invalidSettings = {
        ...DEFAULT_SETTINGS,
        uidKey: DEFAULT_SETTINGS.dateOpenedKey
      };

      expect(validateSettings(invalidSettings)).toBe(false);
    });

    it('should report unique YAML keys correctly', () => {
      expect(hasUniqueYamlKeys({
        dateOpenedKey: 'opened',
        dateClosedKey: 'closed',
        uidKey: 'uid',
        lastViewKey: 'view',
        lastUnfocusKey: 'unfocus'
      })).toBe(true);

      expect(hasUniqueYamlKeys({
        dateOpenedKey: 'opened',
        dateClosedKey: 'closed',
        uidKey: 'opened',
        lastViewKey: 'view',
        lastUnfocusKey: 'unfocus'
      })).toBe(false);
    });
  });
});