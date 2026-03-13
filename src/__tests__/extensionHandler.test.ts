import { App, TFile, TFolder } from 'obsidian';
import { ExtensionHandler } from '../extensionHandler';

describe('ExtensionHandler', () => {
    let app: App;

    beforeEach(() => {
        app = new App();
        app.vault.rename = jest.fn().mockResolvedValue(undefined);
    });

    it('changeExtension renames file to target extension', async () => {
        const file = new TFile();
        file.path = 'notes/a.md';
        file.extension = 'md';

        const handler = new ExtensionHandler(app, {
            customExtFrom: 'md',
            customExtTo: 'txt',
            folderRecursion: 'not-recursive'
        } as any);

        const changed = await handler.changeExtension(file, 'txt');
        expect(changed).toBe(true);
        expect(app.vault.rename).toHaveBeenCalledWith(file, 'notes/a.txt');
    });

    it('changeExtension should skip when extension is already target', async () => {
        const file = new TFile();
        file.path = 'notes/a.txt';
        file.extension = 'txt';

        const handler = new ExtensionHandler(app, {
            customExtFrom: 'md',
            customExtTo: 'txt',
            folderRecursion: 'not-recursive'
        } as any);

        const changed = await handler.changeExtension(file, 'txt');
        expect(changed).toBe(false);
        expect(app.vault.rename).not.toHaveBeenCalled();
    });

    it('folder conversion only renames matching extensions', async () => {
        const folder = new TFolder();
        (folder as unknown as { path: string }).path = 'root';
        const a = new TFile();
        a.path = 'root/a.txt';
        a.extension = 'txt';
        const b = new TFile();
        b.path = 'root/b.md';
        b.extension = 'md';
        folder.children = [a, b];

        const handler = new ExtensionHandler(app, {
            customExtFrom: 'md',
            customExtTo: 'txt',
            folderRecursion: 'not-recursive'
        } as any);

        const count = await handler.changeFolderTxtToMd(folder);
        expect(count).toBe(1);
        expect(app.vault.rename).toHaveBeenCalledTimes(1);
        expect(app.vault.rename).toHaveBeenCalledWith(a, 'root/a.md');
    });
});
