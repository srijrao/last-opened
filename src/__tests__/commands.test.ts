import { CommandRegistry } from '../commands';
import { FileHandler } from '../fileHandler';
import { App, TFile } from 'obsidian';
import { UidHandler } from '../uidHandler';

// Mock Notice globally
jest.mock('obsidian', () => ({
  ...jest.requireActual('obsidian'),
  Notice: jest.fn()
}));

describe('CommandRegistry', () => {
  let mockPlugin: any;
  let mockFileHandler: FileHandler;
  let mockApp: App;
  let mockActiveFile: TFile;
  let commandRegistry: CommandRegistry;
  let mockUidHandler: UidHandler;

  beforeEach(() => {
    // Clear Notice mock
    const { Notice } = require('obsidian');
    Notice.mockClear();
    // Mock active file
    mockActiveFile = new TFile();
    mockActiveFile.path = 'test.md';

    // Mock app with workspace
    mockApp = new App();
    mockApp.workspace = {
      getActiveFile: jest.fn().mockReturnValue(mockActiveFile)
    } as any;

    // Mock plugin (avoid abstract class instantiation)
    mockPlugin = {
      app: mockApp,
      addCommand: jest.fn()
    };

    // Mock file handler
    mockFileHandler = {
      addYAMLKeys: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockUidHandler = {
      addUidIfAbsent: jest.fn().mockResolvedValue(true),
      addOrReplaceUid: jest.fn().mockResolvedValue(undefined),
      addUidIfAbsentToFolder: jest.fn().mockResolvedValue(0),
      addOrReplaceUidToFolder: jest.fn().mockResolvedValue(0)
    } as any;

    commandRegistry = new CommandRegistry(mockPlugin, mockFileHandler, mockUidHandler);
  });

  it('should register seven commands on registerCommands', () => {
    commandRegistry.registerCommands();

    expect(mockPlugin.addCommand).toHaveBeenCalledTimes(7);
    expect(mockPlugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'last-opened-add-both-keys',
        name: 'Add last-opened and last-closed keys'
      })
    );
    expect(mockPlugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'last-opened-add-opened-key',
        name: 'Add only last-opened key'
      })
    );
    expect(mockPlugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'last-opened-add-closed-key',
        name: 'Add only last-closed key'
      })
    );
    expect(mockPlugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'last-opened-uid-add-if-absent',
        name: 'Add unique ID to YAML if not present'
      })
    );
  });

  it('should call addYAMLKeys with correct parameters for each command', async () => {
    commandRegistry.registerCommands();

    // Get the callbacks from the mock calls
    const bothKeysCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[0][0].callback;
    const openedKeyCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[1][0].callback;
    const closedKeyCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[2][0].callback;

    // Mock Notice to avoid console output
    const { Notice } = require('obsidian');

    // Test both keys command
    await bothKeysCallback();
    expect(mockFileHandler.addYAMLKeys).toHaveBeenCalledWith(mockActiveFile, 'both');

    // Test opened key command
    await openedKeyCallback();
    expect(mockFileHandler.addYAMLKeys).toHaveBeenCalledWith(mockActiveFile, 'opened');

    // Test closed key command
    await closedKeyCallback();
    expect(mockFileHandler.addYAMLKeys).toHaveBeenCalledWith(mockActiveFile, 'closed');

    expect(Notice).toHaveBeenCalledWith('✓ Added keys to the note\'s frontmatter');
  });

  it('should show error notice when no active file', async () => {
    // Mock no active file
    mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);

    commandRegistry.registerCommands();
    const bothKeysCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[0][0].callback;

    // Mock Notice
    const { Notice } = require('obsidian');

    await bothKeysCallback();

    expect(mockFileHandler.addYAMLKeys).not.toHaveBeenCalled();
    // Notice should have been called with error message
    expect(Notice).toHaveBeenCalledWith('No note is currently open. Please open a note first.');
  });

  it('should handle errors from addYAMLKeys gracefully', async () => {
    // Mock file handler to throw error
    mockFileHandler.addYAMLKeys = jest.fn().mockRejectedValue(new Error('Test error'));

    commandRegistry.registerCommands();
    const bothKeysCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[0][0].callback;

    // Mock Notice
    const { Notice } = require('obsidian');

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await bothKeysCallback();

    expect(consoleSpy).toHaveBeenCalledWith('Error adding keys to note:', expect.any(Error));
    expect(Notice).toHaveBeenCalledWith('✗ Failed to add keys. Please check the console for details.');

    consoleSpy.mockRestore();
  });
});