import { FileHandler } from '../fileHandler';
import { App, TFile } from 'obsidian';

describe('FileHandler edge cases', () => {
  let mockApp: App;
  let mockEventHandler: any;
  let mockFile: TFile;

  beforeEach(() => {
    mockApp = new App();
    mockApp.fileManager.processFrontMatter = jest.fn();

    mockEventHandler = {
      getFileOpeningTime: jest.fn()
    };

    mockFile = new TFile();
    mockFile.path = 'edge-case.md';
  });

  describe('processFrontMatter errors', () => {
    it('should handle processFrontMatter throwing an error in hasTrackedKeys', async () => {
      const fileHandler = new FileHandler(mockApp, {} as any, {} as any, mockEventHandler);
      (mockApp.fileManager.processFrontMatter as jest.Mock).mockRejectedValue(new Error('YAML parse error'));

      // Should throw, not return false
      await expect(fileHandler.hasTrackedKeys(mockFile)).rejects.toThrow('YAML parse error');
    });

    it('should handle processFrontMatter throwing an error in updateFrontmatterProperty', async () => {
      const settings = {
        dateOpenedKey: 'date_last_opened',
        dateClosedKey: 'date_last_closed',
        dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
        trackOpened: true,
        trackClosed: true,
        timezone: 'local',
        historyDepth: 1
      } as any;

      const timestampGenerator = {
        generateTimestamp: jest.fn().mockReturnValue('TS')
      } as any;

      const fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

      // First call succeeds (hasTrackedKeys)
      (mockApp.fileManager.processFrontMatter as jest.Mock)
        .mockResolvedValueOnce(undefined) // hasTrackedKeys call
        .mockRejectedValueOnce(new Error('Write error')); // update call

      // Should not throw, should handle error gracefully
      await expect(fileHandler.updateDateOpened(mockFile)).resolves.not.toThrow();
    });
  });

  describe('invalid frontmatter data types', () => {
    it('should handle non-string values in frontmatter', async () => {
      const settings = {
        dateOpenedKey: 'date_last_opened',
        dateClosedKey: 'date_last_closed',
        dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
        trackOpened: true,
        trackClosed: true,
        timezone: 'local',
        historyDepth: 3
      } as any;

      const timestampGenerator = {
        generateTimestamp: jest.fn().mockReturnValue('NEW_TS')
      } as any;

      const fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

      // Frontmatter with invalid data types
      const invalidFrontmatter = {
        'date_last_opened': 12345, // number instead of string
        'date_last_opened_1': null, // null value
        'date_last_opened_2': 'old2',
        'date_last_opened_history': 'not-a-number' // invalid override
      };

      let capturedFrontmatter: Record<string, unknown> | null = null;
      let step = 0;
      (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
        step++;
        if (step === 1) {
          cb(invalidFrontmatter);
        } else {
          const fm = { ...invalidFrontmatter };
          cb(fm);
          capturedFrontmatter = fm;
        }
      });

      await fileHandler.updateDateOpened(mockFile);

      // Shifting behavior: _1 = NEW_TS, _2 = old _1, _3 = old _2
      // With depth 3, all kept
      expect(capturedFrontmatter!['date_last_opened']).toBe('NEW_TS');
      expect(capturedFrontmatter!['date_last_opened_1']).toBe('NEW_TS');
      expect(capturedFrontmatter!['date_last_opened_2']).toBe(null); // shifted from old _1
      expect(capturedFrontmatter!['date_last_opened_3']).toBe('old2'); // shifted from old _2
    });

    it('should handle mixed array and numbered key formats', async () => {
      const settings = {
        dateOpenedKey: 'date_last_opened',
        dateClosedKey: 'date_last_closed',
        dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
        trackOpened: true,
        trackClosed: true,
        timezone: 'local',
        historyDepth: 2
      } as any;

      const timestampGenerator = {
        generateTimestamp: jest.fn().mockReturnValue('MIGRATE_TS')
      } as any;

      const fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

      // Mixed format: old array + new numbered keys
      const mixedFrontmatter = {
        'date_last_opened': ['old1', 'old2'], // old array format
        'date_last_opened_1': 'numbered1', // new format
        'date_last_opened_3': 'orphaned' // beyond current depth
      };

      let capturedFrontmatter: Record<string, unknown> | null = null;
      let step = 0;
      (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
        step++;
        if (step === 1) {
          cb(mixedFrontmatter);
        } else {
          const fm = { ...mixedFrontmatter };
          cb(fm);
          capturedFrontmatter = fm;
        }
      });

      await fileHandler.updateDateOpened(mockFile);

      // Should overwrite old array format with new timestamp and add numbered keys
      expect(capturedFrontmatter!['date_last_opened']).toBe('MIGRATE_TS');
      expect(capturedFrontmatter!['date_last_opened_1']).toBe('MIGRATE_TS');
      expect(capturedFrontmatter!['date_last_opened_2']).toBe('numbered1'); // shifted from _1
      expect(capturedFrontmatter!['date_last_opened_3']).toBeUndefined(); // cleaned up beyond depth
      // Old array is overwritten by new timestamp
      expect(capturedFrontmatter!['date_last_opened']).not.toEqual(['old1', 'old2']);
    });
  });

  describe('override validation edge cases', () => {
    it('should ignore invalid override values and use default historyDepth', async () => {
      const settings = {
        dateOpenedKey: 'date_last_opened',
        dateClosedKey: 'date_last_closed',
        dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
        trackOpened: true,
        trackClosed: true,
        timezone: 'local',
        historyDepth: 3
      } as any;

      const timestampGenerator = {
        generateTimestamp: jest.fn().mockReturnValue('VALID_TS')
      } as any;

      const fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

      // Test with invalid override - should use default historyDepth
      const frontmatter = {
        [`date_last_opened_history`]: 'invalid',
        'date_last_opened_1': 'old1',
        'date_last_opened_2': 'old2'
      };

      let capturedFrontmatter: Record<string, unknown> | null = null;
      (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
        const fm = { ...frontmatter };
        cb(fm);
        capturedFrontmatter = fm;
      });

      await fileHandler.updateDateOpened(mockFile);

      // With historyDepth 3, should have 3 numbered keys
      expect(capturedFrontmatter!['date_last_opened']).toBe('VALID_TS');
      expect(capturedFrontmatter!['date_last_opened_1']).toBe('VALID_TS');
      expect(capturedFrontmatter!['date_last_opened_2']).toBe('old1');
      expect(capturedFrontmatter!['date_last_opened_3']).toBe('old2');
    });
  });

  describe('hasTrackedKeys edge cases', () => {
    it('should detect files with only override keys', async () => {
      const settings = {
        dateOpenedKey: 'custom_opened',
        dateClosedKey: 'custom_closed',
        dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
        trackOpened: true,
        trackClosed: true,
        timezone: 'local',
        historyDepth: 1
      } as any;

      const fileHandler = new FileHandler(mockApp, settings, {} as any, mockEventHandler);

      const testFrontmatter = {
        'custom_opened_history': 2, // only override key
        'unrelated': 'data'
      };

      (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
        cb(testFrontmatter);
      });

      const result = await fileHandler.hasTrackedKeys(mockFile);
      expect(result).toBe(true); // Should detect override key
    });

    it('should handle frontmatter processing errors gracefully', async () => {
      const fileHandler = new FileHandler(mockApp, {} as any, {} as any, mockEventHandler);
      (mockApp.fileManager.processFrontMatter as jest.Mock).mockRejectedValue(new Error('Parse error'));

      // Should throw, not return false
      await expect(fileHandler.hasTrackedKeys(mockFile)).rejects.toThrow('Parse error');
    });
  });
});