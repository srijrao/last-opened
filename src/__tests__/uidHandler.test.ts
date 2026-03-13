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
            folderRecursion: 'not-recursive'
        } as any);
        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';

        await handler.addOrReplaceUid(file);

        expect(frontmatter.uid).toMatch(/^[a-z0-9]{8}$/);
        expect(frontmatter.uid).not.toBe('old');
    });

    it('folder variant should only process markdown files', async () => {
        const handler = new UidHandler(app, {
            uidKey: 'uid',
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

        await handler.addOrReplaceUidToFolder(folder);
        expect(processed).toEqual(['root/a.md']);
    });
});
