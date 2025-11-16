import { EventHandler } from '../eventHandler';
import { Plugin, TFile, App } from 'obsidian';

describe('EventHandler persistence and cleanup', () => {
  let mockPlugin: any;
  let mockApp: App;
  let eventHandler: EventHandler;
  let mockFileHandler: any;

  beforeEach(() => {
    mockApp = new App();
    mockApp.vault = {
      getAbstractFileByPath: jest.fn(),
      getMarkdownFiles: jest.fn()
    } as any;

    mockPlugin = {
      app: mockApp,
      saveData: jest.fn().mockResolvedValue(undefined),
      loadData: jest.fn().mockResolvedValue(null)
    };

    mockFileHandler = {
      updateDateOpened: jest.fn().mockResolvedValue(undefined),
      updateDateClosed: jest.fn().mockResolvedValue(undefined)
    };

    eventHandler = new EventHandler(mockPlugin, mockFileHandler);
  });

  describe('saveOpeningTimes and loadOpeningTimes', () => {
    it('should save opening times to plugin data', async () => {
      // Simulate some opening times
      const testFile = new TFile();
      testFile.path = 'test.md';
      const openingTime = new Date('2023-11-15T10:00:00Z');

      // Manually set file opening times (normally done by layout change handler)
      (eventHandler as any).fileOpeningTimes.set('test.md', openingTime);

      await eventHandler.saveOpeningTimes();

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        openingTimes: {
          'test.md': openingTime.toISOString()
        }
      });
    });

    it('should load opening times from plugin data', async () => {
      const storedData = {
        openingTimes: {
          'test.md': '2023-11-15T10:00:00.000Z',
          'other.md': '2023-11-14T09:00:00.000Z'
        }
      };

      mockPlugin.loadData.mockResolvedValue(storedData);

      await eventHandler.loadOpeningTimes();

      const testTime = (eventHandler as any).fileOpeningTimes.get('test.md');
      const otherTime = (eventHandler as any).fileOpeningTimes.get('other.md');

      expect(testTime).toEqual(new Date('2023-11-15T10:00:00.000Z'));
      expect(otherTime).toEqual(new Date('2023-11-14T09:00:00.000Z'));
    });

    it('should handle missing openingTimes data gracefully', async () => {
      mockPlugin.loadData.mockResolvedValue({});

      await eventHandler.loadOpeningTimes();

      expect((eventHandler as any).fileOpeningTimes.size).toBe(0);
    });
  });

  describe('cleanupStaleData', () => {
    beforeEach(() => {
      // Mock vault files
      const mockFiles = [
        { path: 'existing1.md' },
        { path: 'existing2.md' }
      ] as TFile[];

      (mockApp.vault.getMarkdownFiles as jest.Mock).mockReturnValue(mockFiles);
    });

    it('should remove entries for deleted files', () => {
      // Set up opening times including some for non-existent files
      (eventHandler as any).fileOpeningTimes.set('existing1.md', new Date());
      (eventHandler as any).fileOpeningTimes.set('existing2.md', new Date());
      (eventHandler as any).fileOpeningTimes.set('deleted.md', new Date());

      eventHandler.cleanupStaleData();

      expect((eventHandler as any).fileOpeningTimes.has('existing1.md')).toBe(true);
      expect((eventHandler as any).fileOpeningTimes.has('existing2.md')).toBe(true);
      expect((eventHandler as any).fileOpeningTimes.has('deleted.md')).toBe(false);
    });

    it('should remove entries older than 48 hours', () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago
      const oldTime = new Date(now.getTime() - (72 * 60 * 60 * 1000)); // 72 hours ago

      (eventHandler as any).fileOpeningTimes.set('existing1.md', recentTime);
      (eventHandler as any).fileOpeningTimes.set('existing2.md', oldTime);

      eventHandler.cleanupStaleData();

      expect((eventHandler as any).fileOpeningTimes.has('existing1.md')).toBe(true);
      expect((eventHandler as any).fileOpeningTimes.has('existing2.md')).toBe(false);
    });
  });

  describe('getFileOpeningTime', () => {
    it('should return stored opening time for file', () => {
      const testFile = new TFile();
      testFile.path = 'test.md';
      const openingTime = new Date('2023-11-15T10:00:00Z');

      (eventHandler as any).fileOpeningTimes.set('test.md', openingTime);

      const result = eventHandler.getFileOpeningTime(testFile);
      expect(result).toEqual(openingTime);
    });

    it('should return null for unknown file', () => {
      const testFile = new TFile();
      testFile.path = 'unknown.md';

      const result = eventHandler.getFileOpeningTime(testFile);
      expect(result).toBeNull();
    });
  });
});