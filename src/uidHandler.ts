import { App, TFile, TFolder } from 'obsidian';
import { LastOpenedSettings } from './settings';
import { getFilesInFolder } from './folderUtils';

const UID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export interface FolderUidUpdateResult {
    modifiedFiles: number;
    totalFiles: number;
}

export interface DuplicateUidGroup {
    uid: string;
    files: TFile[];
}

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

function normalizeUidLength(length: unknown, fallback = 8): number {
    if (typeof length !== 'number' || Number.isNaN(length)) {
        return fallback;
    }

    return Math.max(4, Math.min(32, Math.floor(length)));
}

export class UidHandler {
    constructor(private app: App, private settings: LastOpenedSettings) { }

    private getUidLength(): number {
        return normalizeUidLength(this.settings.uidLength, 8);
    }

    private async readUidValue(file: TFile): Promise<string | null> {
        let uidValue: string | null = null;

        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            const value = frontmatter[this.settings.uidKey];
            if (hasMeaningfulValue(value)) {
                uidValue = String(value).trim();
            }
        });

        return uidValue;
    }

    async addUidIfAbsent(file: TFile): Promise<boolean> {
        let wrote = false;
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            const key = this.settings.uidKey;
            if (!hasMeaningfulValue(frontmatter[key])) {
                frontmatter[key] = generateUID(this.getUidLength());
                wrote = true;
            }
        });
        return wrote;
    }

    async addOrReplaceUid(file: TFile): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            frontmatter[this.settings.uidKey] = generateUID(this.getUidLength());
        });
    }

    async addUidIfAbsentToFolder(folder: TFolder): Promise<FolderUidUpdateResult> {
        const files = await getFilesInFolder(this.app, this.settings, folder, (file) => file.extension === 'md');
        let updated = 0;
        for (const file of files) {
            if (await this.addUidIfAbsent(file)) {
                updated += 1;
            }
        }
        return {
            modifiedFiles: updated,
            totalFiles: files.length
        };
    }

    async addOrReplaceUidToFolder(folder: TFolder): Promise<FolderUidUpdateResult> {
        const files = await getFilesInFolder(this.app, this.settings, folder, (file) => file.extension === 'md');
        for (const file of files) {
            await this.addOrReplaceUid(file);
        }
        return {
            modifiedFiles: files.length,
            totalFiles: files.length
        };
    }

    async findDuplicateUids(): Promise<DuplicateUidGroup[]> {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const filesByUid = new Map<string, TFile[]>();

        for (const file of markdownFiles) {
            const uidValue = await this.readUidValue(file);
            if (!uidValue) {
                continue;
            }

            const existing = filesByUid.get(uidValue);
            if (existing) {
                existing.push(file);
                continue;
            }

            filesByUid.set(uidValue, [file]);
        }

        return Array.from(filesByUid.entries())
            .filter(([, files]) => files.length > 1)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([uid, files]) => ({
                uid,
                files: files.slice().sort((left, right) => left.path.localeCompare(right.path))
            }));
    }
}
