import { FileHandler, createFileHandler } from '../fileHandler';
import { TimestampGenerator } from '../timestamp';
import { DEFAULT_SETTINGS } from '../settings';
import { App, TFile } from 'obsidian';

describe('FileHandler Integration', () => {
  let mockApp: App;
  let timestampGenerator: TimestampGenerator;
  let fileHandler: FileHandler;
  let mockEventHandler: any;
  let mockFile: TFile;

  beforeEach(() => {
    // Mock App with fileManager
    mockApp = new App();
    mockApp.fileManager.processFrontMatter = jest.fn();

    timestampGenerator = new TimestampGenerator(DEFAULT_SETTINGS);

    // Mock EventHandler
    mockEventHandler = {
      getFileOpeningTime: jest.fn()
    };

    fileHandler = new FileHandler(
      mockApp,
      DEFAULT_SETTINGS,
      timestampGenerator,
      mockEventHandler
    );

    mockFile = new TFile();
    mockFile.path = 'test.md';
  });

  describe('updateDateOpened', () => {
    it('should not update if tracking is disabled', async () => {
      const disabledSettings = { ...DEFAULT_SETTINGS, trackOpened: false };
      const disabledHandler = new FileHandler(
        mockApp,
        disabledSettings,
        timestampGenerator,
        mockEventHandler
      );

      await disabledHandler.updateDateOpened(mockFile);
      expect(mockApp.fileManager.processFrontMatter).not.toHaveBeenCalled();
    });

    it('should update frontmatter when tracking is enabled and file has keys', async () => {
      // Mock processFrontMatter to simulate file with existing keys
      let callCount = 0;
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callCount++;
        if (callCount === 1) {
          // hasTrackedKeys call
          callback({ last_opened: 'existing' });
        } else {
          // update call
          callback({});
        }
      });

      await fileHandler.updateDateOpened(mockFile);
      expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasTrackedKeys', () => {
    it('should return true if file has opened key', async () => {
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({ last_opened: '2023-01-01' });
      });

      const result = await fileHandler.hasTrackedKeys(mockFile);
      expect(result).toBe(true);
    });

    it('should return true if file has closed key', async () => {
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({ last_closed: '2023-01-01' });
      });

      const result = await fileHandler.hasTrackedKeys(mockFile);
      expect(result).toBe(true);
    });

    it('should return false if file has no tracked keys', async () => {
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({ title: 'Test' });
      });

      const result = await fileHandler.hasTrackedKeys(mockFile);
      expect(result).toBe(false);
    });
  });

  describe('addYAMLKeys', () => {
    it('should add both keys when keyType is both', async () => {
      const openingTime = new Date('2023-11-14T10:00:00Z');
      mockEventHandler.getFileOpeningTime.mockReturnValue(openingTime);

      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({});
      });

      await fileHandler.addYAMLKeys(mockFile, 'both');

      expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
      expect(mockEventHandler.getFileOpeningTime).toHaveBeenCalledWith(mockFile);
    });

    it('should add only opened key when keyType is opened', async () => {
      const openingTime = new Date('2023-11-14T10:00:00Z');
      mockEventHandler.getFileOpeningTime.mockReturnValue(openingTime);

      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({});
      });

      await fileHandler.addYAMLKeys(mockFile, 'opened');

      expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
      expect(mockEventHandler.getFileOpeningTime).toHaveBeenCalledWith(mockFile);
    });

    it('should add only closed key when keyType is closed', async () => {
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({});
      });

      await fileHandler.addYAMLKeys(mockFile, 'closed');

      expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
      expect(mockEventHandler.getFileOpeningTime).not.toHaveBeenCalled();
    });

    it('should use current time when no stored opening time', async () => {
      mockEventHandler.getFileOpeningTime.mockReturnValue(null);

      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file, callback) => {
        callback({});
      });

      await fileHandler.addYAMLKeys(mockFile, 'both');

      expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
      expect(mockEventHandler.getFileOpeningTime).toHaveBeenCalledWith(mockFile);
    });

    it('should preserve existing uid when inserting timestamp keys', async () => {
      const frontmatter: Record<string, unknown> = {
        uid: 'abc123xy'
      };

      mockEventHandler.getFileOpeningTime.mockReturnValue(null);
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (_file, callback) => {
        callback(frontmatter);
      });

      await fileHandler.addYAMLKeys(mockFile, 'both');

      expect(frontmatter.uid).toBe('abc123xy');
      expect(frontmatter[DEFAULT_SETTINGS.dateOpenedKey]).toBeDefined();
      expect(frontmatter[DEFAULT_SETTINGS.dateClosedKey]).toBeDefined();
    });

    it('should generate uid when uid key is present but empty', async () => {
      const frontmatter: Record<string, unknown> = {
        uid: '   '
      };

      mockEventHandler.getFileOpeningTime.mockReturnValue(null);
      mockApp.fileManager.processFrontMatter = jest.fn().mockImplementation(async (_file, callback) => {
        callback(frontmatter);
      });

      await fileHandler.addYAMLKeys(mockFile, 'both');

      expect(frontmatter.uid).toMatch(/^[a-z0-9]{8}$/);
      expect(frontmatter[DEFAULT_SETTINGS.dateOpenedKey]).toBeDefined();
      expect(frontmatter[DEFAULT_SETTINGS.dateClosedKey]).toBeDefined();
    });
  });

  describe('createFileHandler', () => {
    it('should create a FileHandler instance', () => {
      const handler = createFileHandler(mockApp, DEFAULT_SETTINGS, timestampGenerator, mockEventHandler);
      expect(handler).toBeInstanceOf(FileHandler);
    });
  });
});