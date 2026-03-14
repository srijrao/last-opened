import { Menu, Plugin, TFile, TFolder } from 'obsidian';
import { registerFileExplorerMenus } from '../contextMenus';

jest.mock('obsidian', () => ({
    ...jest.requireActual('obsidian'),
    Notice: jest.fn()
}));

describe('context menu registration', () => {
    it('adds file menu items and invokes extension handlers', async () => {
        let listener: ((menu: Menu, file: any) => void) | null = null;
        const plugin = {
            app: {
                workspace: {
                    on: jest.fn().mockImplementation((_event: string, cb: (menu: Menu, file: any) => void) => {
                        listener = cb;
                        return cb;
                    })
                }
            },
            registerEvent: jest.fn()
        } as unknown as Plugin;

        const extensionHandler = {
            changeExtToTxt: jest.fn().mockResolvedValue(true),
            changeExtToMd: jest.fn().mockResolvedValue(true),
            changeFolderTxtToMd: jest.fn().mockResolvedValue({ modifiedFiles: 2, totalFiles: 4 }),
            changeFolderMdToTxt: jest.fn().mockResolvedValue({ modifiedFiles: 3, totalFiles: 3 }),
            changeFolderCustom: jest.fn().mockResolvedValue({ modifiedFiles: 4, totalFiles: 5 })
        } as any;

        registerFileExplorerMenus(plugin, extensionHandler);
        expect(listener).toBeTruthy();

        const file = new TFile();
        file.path = 'a.md';
        file.extension = 'md';
        const menu = new Menu() as unknown as { items: Array<{ _onClick: () => Promise<void> }> };
        listener!(menu as unknown as Menu, file);

        expect(menu.items).toHaveLength(2);
        await menu.items[0]._onClick();
        await menu.items[1]._onClick();
        expect(extensionHandler.changeExtToTxt).toHaveBeenCalledWith(file);
        expect(extensionHandler.changeExtToMd).toHaveBeenCalledWith(file);
    });

    it('adds folder items and invokes folder handlers', async () => {
        let listener: ((menu: Menu, file: any) => void) | null = null;
        const plugin = {
            app: {
                workspace: {
                    on: jest.fn().mockImplementation((_event: string, cb: (menu: Menu, file: any) => void) => {
                        listener = cb;
                        return cb;
                    })
                }
            },
            registerEvent: jest.fn()
        } as unknown as Plugin;

        const extensionHandler = {
            changeExtToTxt: jest.fn().mockResolvedValue(true),
            changeExtToMd: jest.fn().mockResolvedValue(true),
            changeFolderTxtToMd: jest.fn().mockResolvedValue({ modifiedFiles: 2, totalFiles: 4 }),
            changeFolderMdToTxt: jest.fn().mockResolvedValue({ modifiedFiles: 3, totalFiles: 3 }),
            changeFolderCustom: jest.fn().mockResolvedValue({ modifiedFiles: 4, totalFiles: 5 })
        } as any;

		const { Notice } = require('obsidian');

        registerFileExplorerMenus(plugin, extensionHandler);
        const folder = new TFolder();
        (folder as unknown as { path: string }).path = 'root';
        const menu = new Menu() as unknown as { items: Array<{ _onClick: () => Promise<void> }> };
        listener!(menu as unknown as Menu, folder);

        expect(menu.items).toHaveLength(3);
        await menu.items[0]._onClick();
        await menu.items[1]._onClick();
        await menu.items[2]._onClick();
        expect(extensionHandler.changeFolderTxtToMd).toHaveBeenCalledWith(folder);
        expect(extensionHandler.changeFolderMdToTxt).toHaveBeenCalledWith(folder);
        expect(extensionHandler.changeFolderCustom).toHaveBeenCalledWith(folder);
		expect(Notice).toHaveBeenCalledWith('Changed extensions on 2 of 4 file(s).');
		expect(Notice).toHaveBeenCalledWith('Changed extensions on 3 of 3 file(s).');
		expect(Notice).toHaveBeenCalledWith('Changed extensions on 4 of 5 file(s).');
    });
});
