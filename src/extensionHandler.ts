import { App, TFile, TFolder } from 'obsidian';
import { LastOpenedSettings } from './settings';
import { getFilesInFolder } from './folderUtils';

export interface FolderExtensionChangeResult {
    modifiedFiles: number;
    totalFiles: number;
    fromExtension: string;
    toExtension: string;
}

function normalizeExtension(value: string): string {
    return value.replace(/^\./, '').trim().toLowerCase();
}

function getRenamedPath(path: string, targetExt: string): string {
    const ext = normalizeExtension(targetExt);
    const dot = path.lastIndexOf('.');
    if (dot === -1) {
        return `${path}.${ext}`;
    }
    return `${path.substring(0, dot)}.${ext}`;
}

export class ExtensionHandler {
    constructor(private app: App, private settings: LastOpenedSettings) { }

    async changeExtension(file: TFile, targetExt: string): Promise<boolean> {
        const normalized = normalizeExtension(targetExt);
        if (!normalized) {
            return false;
        }
        if (file.extension.toLowerCase() === normalized) {
            return false;
        }
        const newPath = getRenamedPath(file.path, normalized);
        await this.app.vault.rename(file, newPath);
        return true;
    }

    async changeExtToTxt(file: TFile): Promise<boolean> {
        return this.changeExtension(file, 'txt');
    }

    async changeExtToMd(file: TFile): Promise<boolean> {
        return this.changeExtension(file, 'md');
    }

    async changeFolderExtensions(folder: TFolder, fromExt: string, toExt: string): Promise<FolderExtensionChangeResult> {
        const from = normalizeExtension(fromExt);
        const to = normalizeExtension(toExt);
        if (!from || !to || from === to) {
            return {
                modifiedFiles: 0,
                totalFiles: 0,
                fromExtension: from,
                toExtension: to
            };
        }

        const files = await getFilesInFolder(
            this.app,
            this.settings,
            folder,
            (file) => file.extension.toLowerCase() === from
        );

        let modifiedFiles = 0;
        for (const file of files) {
            if (await this.changeExtension(file, to)) {
                modifiedFiles += 1;
            }
        }
        return {
            modifiedFiles,
            totalFiles: files.length,
            fromExtension: from,
            toExtension: to
        };
    }

    async changeFolderTxtToMd(folder: TFolder): Promise<FolderExtensionChangeResult> {
        return this.changeFolderExtensions(folder, 'txt', 'md');
    }

    async changeFolderMdToTxt(folder: TFolder): Promise<FolderExtensionChangeResult> {
        return this.changeFolderExtensions(folder, 'md', 'txt');
    }

    async changeFolderCustom(folder: TFolder): Promise<FolderExtensionChangeResult> {
        return this.changeFolderExtensions(
            folder,
            this.settings.customExtFrom,
            this.settings.customExtTo
        );
    }
}
