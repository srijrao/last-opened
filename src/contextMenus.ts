import { Menu, Notice, Plugin, TAbstractFile, TFile, TFolder } from 'obsidian';
import { ExtensionHandler } from './extensionHandler';

function showFolderExtensionNotice(action: string, modifiedFiles: number, totalFiles: number): void {
    new Notice(`${action} ${modifiedFiles} of ${totalFiles} file(s).`);
}

export function registerFileExplorerMenus(
    plugin: Plugin,
    extensionHandler: ExtensionHandler
): void {
    plugin.registerEvent(
        plugin.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
            if (file instanceof TFile) {
                addFileMenuItems(menu, file, extensionHandler);
                return;
            }

            if (file instanceof TFolder) {
                addFolderMenuItems(menu, file, extensionHandler);
            }
        })
    );
}

function addFileMenuItems(menu: Menu, file: TFile, extensionHandler: ExtensionHandler): void {
    menu.addItem((item) =>
        item
            .setTitle('Change extension to .txt')
            .setIcon('pencil')
            .onClick(async () => {
                const changed = await extensionHandler.changeExtToTxt(file);
                if (changed) {
                    new Notice('Changed file extension to .txt');
                }
            })
    );

    menu.addItem((item) =>
        item
            .setTitle('Change extension to .md')
            .setIcon('file-text')
            .onClick(async () => {
                const changed = await extensionHandler.changeExtToMd(file);
                if (changed) {
                    new Notice('Changed file extension to .md');
                }
            })
    );
}

function addFolderMenuItems(menu: Menu, folder: TFolder, extensionHandler: ExtensionHandler): void {
    menu.addItem((item) =>
        item
            .setTitle('Change all .txt files to .md')
            .setIcon('folder-sync')
            .onClick(async () => {
                const result = await extensionHandler.changeFolderTxtToMd(folder);
                showFolderExtensionNotice('Changed extensions on', result.modifiedFiles, result.totalFiles);
            })
    );

    menu.addItem((item) =>
        item
            .setTitle('Change all .md files to .txt')
            .setIcon('folder-sync')
            .onClick(async () => {
                const result = await extensionHandler.changeFolderMdToTxt(folder);
                showFolderExtensionNotice('Changed extensions on', result.modifiedFiles, result.totalFiles);
            })
    );

    menu.addItem((item) =>
        item
            .setTitle('Change all custom extension files')
            .setIcon('settings')
            .onClick(async () => {
                const result = await extensionHandler.changeFolderCustom(folder);
                showFolderExtensionNotice('Changed extensions on', result.modifiedFiles, result.totalFiles);
            })
    );
}
