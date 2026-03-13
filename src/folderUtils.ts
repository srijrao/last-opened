import { App, Modal, Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import { LastOpenedSettings } from './settings';

export type RecursionMode = 'fully-recursive' | 'not-recursive' | 'ask' | 'depth';

export interface ResolvedRecursion {
    mode: Exclude<RecursionMode, 'ask'>;
    depth?: number;
}

function normalizeDepth(depth: unknown, fallback = 1): number {
    if (typeof depth !== 'number' || Number.isNaN(depth)) {
        return fallback;
    }
    return Math.max(1, Math.floor(depth));
}

function listChildren(folder: TFolder): TAbstractFile[] {
    if (Array.isArray((folder as unknown as { children?: TAbstractFile[] }).children)) {
        return (folder as unknown as { children: TAbstractFile[] }).children;
    }
    return [];
}

function collectFiles(folder: TFolder, depthLimit: number | null, level = 0): TFile[] {
    const out: TFile[] = [];
    const children = listChildren(folder);

    for (const child of children) {
        if (child instanceof TFile) {
            out.push(child);
            continue;
        }

        if (child instanceof TFolder) {
            if (depthLimit !== null && level >= depthLimit - 1) {
                continue;
            }
            out.push(...collectFiles(child, depthLimit, level + 1));
        }
    }

    return out;
}

export class RecursionModal extends Modal {
    private resolver: ((value: ResolvedRecursion | null) => void) | null = null;
    private readonly showDepthOption: boolean;
    private readonly defaultDepth: number;

    constructor(app: App, showDepthOption: boolean, defaultDepth: number) {
        super(app);
        this.showDepthOption = showDepthOption;
        this.defaultDepth = normalizeDepth(defaultDepth, 1);
    }

    openAndWait(): Promise<ResolvedRecursion | null> {
        return new Promise((resolve) => {
            this.resolver = resolve;
            this.open();
        });
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Folder Recursion' });
        contentEl.createEl('p', {
            text: 'Choose how deeply this operation should scan subfolders.'
        });

        const addButton = (label: string, onClick: () => void) => {
            const btn = contentEl.createEl('button', { text: label });
            btn.addEventListener('click', onClick);
        };

        addButton('Only this folder', () => this.resolveAndClose({ mode: 'not-recursive' }));
        addButton('Fully recursive', () => this.resolveAndClose({ mode: 'fully-recursive' }));

        if (this.showDepthOption) {
            addButton(`Recursive to ${this.defaultDepth} level${this.defaultDepth === 1 ? '' : 's'}`, () =>
                this.resolveAndClose({ mode: 'depth', depth: this.defaultDepth })
            );
        }

        addButton('Cancel', () => this.resolveAndClose(null));
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        if (this.resolver) {
            this.resolver(null);
            this.resolver = null;
        }
    }

    private resolveAndClose(value: ResolvedRecursion | null): void {
        if (this.resolver) {
            this.resolver(value);
            this.resolver = null;
        }
        this.close();
    }
}

export async function resolveRecursion(
    app: App,
    settings: LastOpenedSettings
): Promise<ResolvedRecursion | null> {
    if (settings.folderRecursion === 'ask') {
        const modal = new RecursionModal(
            app,
            settings.showRecursionDepthInAsk,
            settings.folderRecursionDepth
        );
        return modal.openAndWait();
    }

    if (settings.folderRecursion === 'depth') {
        return {
            mode: 'depth',
            depth: normalizeDepth(settings.folderRecursionDepth, 1)
        };
    }

    return { mode: settings.folderRecursion };
}

export async function getFilesInFolder(
    app: App,
    settings: LastOpenedSettings,
    folder: TFolder,
    filter?: (file: TFile) => boolean
): Promise<TFile[]> {
    const resolved = await resolveRecursion(app, settings);
    if (!resolved) {
        new Notice('Operation cancelled.');
        return [];
    }

    let files: TFile[] = [];
    if (resolved.mode === 'not-recursive') {
        files = listChildren(folder).filter((item): item is TFile => item instanceof TFile);
    } else if (resolved.mode === 'fully-recursive') {
        files = collectFiles(folder, null);
    } else {
        const depth = normalizeDepth(resolved.depth, 1);
        files = collectFiles(folder, depth);
    }

    if (filter) {
        return files.filter(filter);
    }

    return files;
}
