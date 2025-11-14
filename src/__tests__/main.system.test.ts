import LastOpenedPlugin from '../main';
import { App } from 'obsidian';

describe('LastOpenedPlugin System Test', () => {
  let mockApp: App;
  let mockManifest: { id: string; version: string };
  let plugin: LastOpenedPlugin;

  beforeEach(() => {
    mockApp = new App();
    mockManifest = { id: 'last-opened', version: '1.0.0' };
    plugin = new LastOpenedPlugin(mockApp, mockManifest);
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
      expect(plugin.settings.dateOpenedKey).toBe('date_last_opened');
    });

    it('should save settings', async () => {
      await plugin.onload();
      plugin.settings.dateOpenedKey = 'custom_opened';
      await plugin.saveSettings();
      // In real Obsidian, this would persist, but in mock it just calls saveData
    });
  });
});