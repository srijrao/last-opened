import { App, TFile, TFolder } from 'obsidian';
import { LastOpenedSettings } from './settings';
import { getFilesInFolder } from './folderUtils';

const UID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateUID(length = 8): string {
    const chars = UID_ALPHABET;
    const random = new Uint8Array(length);
    crypto.getRandomValues(random);
    let out = '';

    for (let i = 0; i < random.length; i++) {
        out += chars[random[i] % chars.length];
    }

    return out;
}

function hasMeaningfulValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    return true;
}

export class UidHandler {
    constructor(private app: App, private settings: LastOpenedSettings) { }

    async addUidIfAbsent(file: TFile): Promise<boolean> {
        let wrote = false;
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            const key = this.settings.uidKey;
            if (!hasMeaningfulValue(frontmatter[key])) {
                frontmatter[key] = generateUID();
                wrote = true;
            }
        });
        return wrote;
    }

    async addOrReplaceUid(file: TFile): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            frontmatter[this.settings.uidKey] = generateUID();
        });
    }

    async addUidIfAbsentToFolder(folder: TFolder): Promise<number> {
        const files = await getFilesInFolder(this.app, this.settings, folder, (file) => file.extension === 'md');
        let updated = 0;
        for (const file of files) {
            if (await this.addUidIfAbsent(file)) {
                updated += 1;
            }
        }
        return updated;
    }

    async addOrReplaceUidToFolder(folder: TFolder): Promise<number> {
        const files = await getFilesInFolder(this.app, this.settings, folder, (file) => file.extension === 'md');
        for (const file of files) {
            await this.addOrReplaceUid(file);
        }
        return files.length;
    }
}
