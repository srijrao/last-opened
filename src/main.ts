import { Plugin, TFile } from 'obsidian';

interface LastOpenedSettings {
	dateFormat: string;
}

const DEFAULT_SETTINGS: LastOpenedSettings = {
	dateFormat: 'YYYY-MM-DDTHH:mm:ss'
}

export default class LastOpenedPlugin extends Plugin {
	settings: LastOpenedSettings;
	private lastActiveFile: TFile | null = null;

	async onload() {
		await this.loadSettings();

		// Register event when a file is opened
		this.registerEvent(
			this.app.workspace.on('file-open', (file: TFile | null) => {
				// Update close time for the previously open file
				if (this.lastActiveFile && file !== this.lastActiveFile) {
					this.updateDateLastClosed(this.lastActiveFile);
				}
				
				// Update open time for the newly opened file
				if (file) {
					this.updateDateLastOpened(file);
					this.lastActiveFile = file;
				}
			})
		);

		// Handle when Obsidian is about to quit
		this.app.workspace.onLayoutReady(() => {
			window.addEventListener('beforeunload', () => {
				if (this.lastActiveFile) {
					this.updateDateLastClosed(this.lastActiveFile);
				}
			});
		});
	}

	async updateDateLastOpened(file: TFile) {
		await this.updateFrontmatter(file, 'date_last_opened');
	}

	async updateDateLastClosed(file: TFile) {
		await this.updateFrontmatter(file, 'date_last_closed');
	}

	async updateFrontmatter(file: TFile, property: string) {
		const timestamp = this.getCurrentTimestamp();
		
		await this.app.fileManager.processFrontMatter(file, (frontmatter: any) => {
			frontmatter[property] = timestamp;
		});
	}

	getCurrentTimestamp(): string {
		const now = new Date();
		// Format: YYYY-MM-DDTHH:mm:ss
		const year = now.getFullYear();
		const month = ('0' + (now.getMonth() + 1)).slice(-2);
		const day = ('0' + now.getDate()).slice(-2);
		const hours = ('0' + now.getHours()).slice(-2);
		const minutes = ('0' + now.getMinutes()).slice(-2);
		const seconds = ('0' + now.getSeconds()).slice(-2);
		
		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
