import LastOpenedPlugin from '../main';
import { App } from 'obsidian';

describe('LastOpenedPlugin System Test', () => {
  let mockApp: App;
  let mockManifest: any;
  let plugin: LastOpenedPlugin;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockApp = new App();
    mockManifest = { id: 'last-opened', version: '1.0.0' };
    plugin = new LastOpenedPlugin(mockApp, mockManifest);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Plugin Lifecycle', () => {
    it('should initialize without errors', async () => {
      await expect(plugin.onload()).resolves.not.toThrow();
    });

    it('should unload without errors', async () => {
      await plugin.onload(); // Initialize first
      await expect(plugin.onunload()).resolves.not.toThrow();
    });

    it('should load default settings', async () => {
      await plugin.onload();
      expect(plugin.settings).toBeDefined();
      expect(plugin.settings.dateOpenedKey).toBe('last_opened');
    });

    it('should save settings', async () => {
      await plugin.onload();
      plugin.settings.dateOpenedKey = 'custom_opened';
      await plugin.saveSettings();
      // In real Obsidian, this would persist, but in mock it just calls saveData
    });
  });
});