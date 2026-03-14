import { App, TFile, TFolder } from 'obsidian';
import { generateUID, UidHandler } from '../uidHandler';

describe('UidHandler', () => {
    let app: App;
    let frontmatter: Record<string, unknown>;

    beforeEach(() => {
        app = new App();
        frontmatter = {};
        app.fileManager.processFrontMatter = jest.fn().mockImplementation(async (_file: TFile, cb: (fm: Record<string, unknown>) => void) => {
            cb(frontmatter);
        });
    });

    it('generateUID should create 8-char lowercase alphanumeric ids', () => {
        const uid = generateUID();
        expect(uid).toMatch(/^[a-z0-9]{8}$/);
    });

    it('addUidIfAbsent should add when key is missing', async () => {
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        const updated = await handler.addUidIfAbsent(file);

        expect(updated).toBe(true);
        expect(frontmatter.uid).toMatch(/^[a-z0-9]{8}$/);
    });

    it('addUidIfAbsent should add when key is empty', async () => {
        frontmatter.uid = '   ';
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        const updated = await handler.addUidIfAbsent(file);

        expect(updated).toBe(true);
        expect(frontmatter.uid).toMatch(/^[a-z0-9]{8}$/);
    });

    it('addUidIfAbsent should skip when key already has value', async () => {
        frontmatter.uid = 'existing';
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        const updated = await handler.addUidIfAbsent(file);

        expect(updated).toBe(false);
        expect(frontmatter.uid).toBe('existing');
    });

    it('addOrReplaceUid should always write new value', async () => {
        frontmatter.uid = 'old';
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        await handler.addOrReplaceUid(file);

        expect(frontmatter.uid).toMatch(/^[a-z0-9]{8}$/);
        expect(frontmatter.uid).not.toBe('old');
    });

    it('should honor configured UID length', async () => {
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 12,
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        await handler.addOrReplaceUid(file);

        expect(frontmatter.uid).toMatch(/^[a-z0-9]{12}$/);
    });

    it('folder variant should only process markdown files and return summary counts', async () => {
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const folder = new TFolder();
        (folder as unknown as { path: string }).path = 'root';
        const mdFile = new TFile();
        mdFile.path = 'root/a.md';
        mdFile.extension = 'md';
        const txtFile = new TFile();
        txtFile.path = 'root/a.txt';
        txtFile.extension = 'txt';
        folder.children = [mdFile, txtFile];

        let processed: string[] = [];
        app.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file: TFile, cb: (fm: Record<string, unknown>) => void) => {
            processed.push(file.path);
            cb({});
        });

        const result = await handler.addOrReplaceUidToFolder(folder);
        expect(result).toEqual({ modifiedFiles: 1, totalFiles: 1 });
        expect(processed).toEqual(['root/a.md']);
    });

    it('findDuplicateUids should return markdown files sharing the same UID', async () => {
        const handler = new UidHandler(app, {
            uidKey: 'uid',
            uidLength: 8,
            folderRecursion: 'not-recursive'
        } as any);
        const first = new TFile();
        first.path = 'root/a.md';
        first.extension = 'md';
        const second = new TFile();
        second.path = 'root/b.md';
        second.extension = 'md';
        const third = new TFile();
        third.path = 'root/c.md';
        third.extension = 'md';

        const frontmatterByPath: Record<string, Record<string, unknown>> = {
            'root/a.md': { uid: 'dup-1' },
            'root/b.md': { uid: 'dup-1' },
            'root/c.md': { uid: 'unique' }
        };

        app.vault.getMarkdownFiles = jest.fn().mockReturnValue([first, second, third]);
        app.fileManager.processFrontMatter = jest.fn().mockImplementation(async (file: TFile, cb: (fm: Record<string, unknown>) => void) => {
            cb(frontmatterByPath[file.path] ?? {});
        });

        const duplicates = await handler.findDuplicateUids();

        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].uid).toBe('dup-1');
        expect(duplicates[0].files.map((file) => file.path)).toEqual(['root/a.md', 'root/b.md']);
    });
});
