import { FileHandler } from '../fileHandler';
import { App, TFile } from 'obsidian';

describe('FileHandler numbered-key history', () => {
  let mockApp: App;
  let mockEventHandler: any;
  let fileHandler: FileHandler;
  let mockFile: TFile;

  beforeEach(() => {
    mockApp = new App();
    mockApp.fileManager.processFrontMatter = jest.fn();

    mockEventHandler = {
      getFileOpeningTime: jest.fn()
    };

    mockFile = new TFile();
    mockFile.path = 'history.md';
  });

  it('addYAMLKeys should create numbered keys when historyDepth > 1', async () => {
    const settings = {
      dateOpenedKey: 'date_last_opened',
      dateClosedKey: 'date_last_closed',
      dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
      trackOpened: true,
      trackClosed: true,
      timezone: 'local',
      historyDepth: 3
    } as any;

    // Provide a stored opening time
    const openingTime = new Date('2023-11-01T10:00:00Z');
    mockEventHandler.getFileOpeningTime.mockReturnValue(openingTime);

    // Create a timestamp generator that returns deterministic strings per call
    const timestampGenerator = {
      generateTimestamp: jest.fn()
        .mockImplementationOnce(() => 'OPEN_TS')
        .mockImplementationOnce(() => 'CLOSE_TS')
    } as any;

    // Capture the mutated frontmatter object
    let capturedFrontmatter: Record<string, unknown> | null = null;
    (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
      const fm: Record<string, unknown> = {};
      cb(fm);
      capturedFrontmatter = fm;
    });

    fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

    await fileHandler.addYAMLKeys(mockFile, 'both');

    expect(capturedFrontmatter).not.toBeNull();
    expect(capturedFrontmatter!['date_last_opened_1']).toBe('OPEN_TS');
    expect(capturedFrontmatter!['date_last_closed_1']).toBe('CLOSE_TS');
    // Base keys should also be set to newest
    expect(capturedFrontmatter!['date_last_opened']).toBe('OPEN_TS');
    expect(capturedFrontmatter!['date_last_closed']).toBe('CLOSE_TS');
  });

  it('updateFrontmatterProperty should shift numbered keys and set _1', async () => {
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

    // Prepare a frontmatter that already has numbered keys
    const initialFrontmatter: Record<string, unknown> = {
      'date_last_opened_1': 'A',
      'date_last_opened_2': 'B',
      'date_last_opened_3': 'C'
    };

    // hasTrackedKeys will be called first and should see date_last_opened_1
    let step = 0;
    (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
      step++;
      if (step === 1) {
        // hasTrackedKeys
        cb(initialFrontmatter);
      } else {
        // update call - provide a mutable copy
        const fm = { ...initialFrontmatter };
        cb(fm);
        // copy back into initialFrontmatter for assertions
        Object.assign(initialFrontmatter, fm);
      }
    });

    fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

    // Call updateDateOpened which calls updateFrontmatterProperty
    await fileHandler.updateDateOpened(mockFile);

    // After update, keys should have shifted: _1 = NEW_TS, _2 = A, _3 = B
    expect(initialFrontmatter['date_last_opened_1']).toBe('NEW_TS');
    expect(initialFrontmatter['date_last_opened_2']).toBe('A');
    expect(initialFrontmatter['date_last_opened_3']).toBe('B');
    // Base key should also be set to newest
    expect(initialFrontmatter['date_last_opened']).toBe('NEW_TS');
  });

  it('per-file frontmatter override should take precedence over plugin setting', async () => {
    const settings = {
      dateOpenedKey: 'date_last_opened',
      dateClosedKey: 'date_last_closed',
      dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
      trackOpened: true,
      trackClosed: true,
      timezone: 'local',
      historyDepth: 5
    } as any;

    const timestampGenerator = {
      generateTimestamp: jest.fn().mockReturnValue('OVERRIDE_TS')
    } as any;

    // Frontmatter signals per-file history of 2
    let initialFrontmatter: Record<string, unknown> = {
      'date_last_opened_history': 2,
      'date_last_opened_1': 'X',
      'date_last_opened_2': 'Y',
      'date_last_opened_3': 'Z'
    };

    let step = 0;
    (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
      step++;
      if (step === 1) {
        cb(initialFrontmatter);
      } else {
        const fm = { ...initialFrontmatter };
        cb(fm);
        initialFrontmatter = fm;
      }
    });

    fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

    await fileHandler.updateDateOpened(mockFile);

    // Per-file history 2 means after update: _1 = OVERRIDE_TS, _2 = X (previous _1)
    expect(initialFrontmatter['date_last_opened_1']).toBe('OVERRIDE_TS');
    expect(initialFrontmatter['date_last_opened_2']).toBe('X');
    // _3 should be removed because per-file depth is 2
    expect(initialFrontmatter['date_last_opened_3']).toBeUndefined();
    // Base key should always reflect newest
    expect(initialFrontmatter['date_last_opened']).toBe('OVERRIDE_TS');
  });

  it('should enforce maximum depth of 5', async () => {
    const settings = {
      dateOpenedKey: 'date_last_opened',
      dateClosedKey: 'date_last_closed',
      dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',
      trackOpened: true,
      trackClosed: true,
      timezone: 'local',
      historyDepth: 10  // Try to set beyond max
    } as any;

    const timestampGenerator = {
      generateTimestamp: jest.fn().mockReturnValue('MAX_TS')
    } as any;

    let initialFrontmatter: Record<string, unknown> = {
      'date_last_opened_1': 'A',
      'date_last_opened_2': 'B',
      'date_last_opened_3': 'C',
      'date_last_opened_4': 'D',
      'date_last_opened_5': 'E',
      'date_last_opened_6': 'F'
    };

    let step = 0;
    (mockApp.fileManager.processFrontMatter as jest.Mock).mockImplementation(async (file: TFile, cb: Function) => {
      step++;
      if (step === 1) {
        cb(initialFrontmatter);
      } else {
        const fm = { ...initialFrontmatter };
        cb(fm);
        initialFrontmatter = fm;
      }
    });

    fileHandler = new FileHandler(mockApp, settings, timestampGenerator, mockEventHandler);

    await fileHandler.updateDateOpened(mockFile);

    // Should only keep 5 entries max, not 10
    expect(initialFrontmatter['date_last_opened_1']).toBe('MAX_TS');
    expect(initialFrontmatter['date_last_opened_5']).toBe('D');
    expect(initialFrontmatter['date_last_opened_6']).toBeUndefined();
    expect(initialFrontmatter['date_last_opened']).toBe('MAX_TS');
  });
});
