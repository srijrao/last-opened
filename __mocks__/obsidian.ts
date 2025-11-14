// Mock Obsidian API for testing
export class Plugin {
  app: any;
  constructor(app: any) {
    this.app = app;
  }
  registerEvent(event: any) {}
  addCommand(command: any) {}
  addSettingTab(tab: any) {}
  async loadData() { return {}; }
  async saveData(data: any) {}
}

export class PluginSettingTab {
  constructor(app: any, plugin: any) {}
  display() {}
}

export class Setting {
  constructor(containerEl: any) {
    this.containerEl = containerEl;
  }
  containerEl: any;
  setName(name: string) { return this; }
  setDesc(desc: string) { return this; }
  addText(callback: any) {
    let currentValue = '';
    const text = {
      setPlaceholder: (placeholder: string) => text,
      setValue: (value: string) => { currentValue = value; return text; },
      onChange: (cb: any) => { cb(currentValue); return text; },
      inputEl: { style: {}, title: '' }
    };
    callback(text);
    return this;
  }
  addDropdown(callback: any) {
    let currentValue = '';
    const dropdown = {
      addOption: (value: string, text: string) => dropdown,
      setValue: (value: string) => { currentValue = value; return dropdown; },
      onChange: (cb: any) => { cb(currentValue); return dropdown; }
    };
    callback(dropdown);
    return this;
  }
  addToggle(callback: any) {
    let currentValue = false;
    const toggle = {
      setValue: (value: boolean) => { currentValue = value; return toggle; },
      onChange: (cb: any) => { cb(currentValue); return toggle; }
    };
    callback(toggle);
    return this;
  }
}

export class TFile {
  path: string;
  constructor() {
    this.path = '';
  }
}

export class App {
  vault: any;
  workspace: any;
  fileManager: any;
  constructor() {
    this.vault = {
      getMarkdownFiles: () => []
    };
    this.workspace = {
      on: (event: string, callback: any) => {},
      onLayoutReady: (callback: any) => callback(),
      getActiveFile: () => null
    };
    this.fileManager = {
      processFrontMatter: async (file: TFile, callback: any) => {}
    };
  }
}

export class Notice {
  constructor(message: string) {}
}