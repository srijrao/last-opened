import { Menu, Plugin, TFile, TFolder } from 'obsidian';
import { registerFileExplorerMenus } from '../contextMenus';

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
            changeFolderTxtToMd: jest.fn().mockResolvedValue(2),
            changeFolderMdToTxt: jest.fn().mockResolvedValue(3),
            changeFolderCustom: jest.fn().mockResolvedValue(4)
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
            changeFolderTxtToMd: jest.fn().mockResolvedValue(2),
            changeFolderMdToTxt: jest.fn().mockResolvedValue(3),
            changeFolderCustom: jest.fn().mockResolvedValue(4)
        } as any;

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
    });
});
