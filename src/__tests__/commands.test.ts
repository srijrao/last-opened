import { CommandRegistry } from '../commands';
import { FileHandler } from '../fileHandler';
import { App, TFile, TFolder } from 'obsidian';
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
    mockActiveFile.parent = new TFolder();
    (mockActiveFile.parent as unknown as { path: string }).path = 'notes';

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
      addUidIfAbsentToFolder: jest.fn().mockResolvedValue({ modifiedFiles: 2, totalFiles: 3 }),
      addOrReplaceUidToFolder: jest.fn().mockResolvedValue({ modifiedFiles: 3, totalFiles: 3 }),
      findDuplicateUids: jest.fn().mockResolvedValue([])
    } as any;

    commandRegistry = new CommandRegistry(mockPlugin, mockFileHandler, mockUidHandler);
  });

  it('should register eight commands on registerCommands', () => {
    commandRegistry.registerCommands();

    expect(mockPlugin.addCommand).toHaveBeenCalledTimes(8);
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
    expect(mockPlugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'last-opened-uid-find-duplicates',
        name: 'Find files with duplicate unique IDs'
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

  it('should summarize folder UID updates for add-if-absent', async () => {
    commandRegistry.registerCommands();
    const addUidFolderCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[5][0].callback;
    const { Notice } = require('obsidian');

    await addUidFolderCallback();

    expect(mockUidHandler.addUidIfAbsentToFolder).toHaveBeenCalledWith(mockActiveFile.parent);
    expect(Notice).toHaveBeenCalledWith('Added UIDs to 2 of 3 file(s)');
  });

  it('should report duplicate UID files when duplicates exist', async () => {
    mockUidHandler.findDuplicateUids = jest.fn().mockResolvedValue([
      {
        uid: 'dup-1',
        files: [{ path: 'notes/a.md' }, { path: 'notes/b.md' }]
      }
    ]);
    commandRegistry = new CommandRegistry(mockPlugin, mockFileHandler, mockUidHandler);
    commandRegistry.registerCommands();
    const duplicateCommandCallback = (mockPlugin.addCommand as jest.Mock).mock.calls[7][0].callback;
    const { Notice } = require('obsidian');
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

    await duplicateCommandCallback();

    expect(mockUidHandler.findDuplicateUids).toHaveBeenCalledTimes(1);
    expect(Notice).toHaveBeenCalledWith(expect.stringContaining('UID "dup-1"'));
    expect(Notice).toHaveBeenCalledWith(expect.stringContaining('notes/a.md'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('notes/b.md'));

    consoleSpy.mockRestore();
  });
});