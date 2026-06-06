// Mock Obsidian API for testing
export class Plugin {
  app: any;
  constructor(app: any) {
    this.app = app;
  }
  registerEvent(event: any) { }
  addCommand(command: any) { }
  addSettingTab(tab: any) { }
  async loadData() { return {}; }
  async saveData(data: any) { }
}

export class PluginSettingTab {
  constructor(app: any, plugin: any) { }
  display() { }
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
      setDisabled: (_disabled: boolean) => text,
      inputEl: { style: {}, title: '' }
    };
    callback(text);
    return this;
  }
  addTextArea(callback: any) {
    let currentValue = '';
    const text = {
      setPlaceholder: (placeholder: string) => text,
      setValue: (value: string) => { currentValue = value; return text; },
      onChange: (cb: any) => { cb(currentValue); return text; },
      setDisabled: (_disabled: boolean) => text,
      inputEl: { style: {}, title: '', rows: 0 }
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
  addSlider(callback: any) {
    let currentValue = 0;
    const slider = {
      setLimits: (_min: number, _max: number, _step: number) => slider,
      setValue: (value: number) => { currentValue = value; return slider; },
      setDynamicTooltip: () => slider,
      onChange: (cb: any) => { cb(currentValue); return slider; }
    };
    callback(slider);
    return this;
  }
  addButton(callback: any) {
    const button = {
      setButtonText: (_text: string) => button,
      setWarning: () => button,
      onClick: (_cb: any) => button
    };
    callback(button);
    return this;
  }
}

export class TFile {
  path: string;
  extension: string;
  basename: string;
  parent: TFolder | null;
  constructor() {
    this.path = '';
    this.extension = '';
    this.basename = '';
    this.parent = null;
  }
}

export class TFolder {
  path: string;
  children: Array<TFile | TFolder>;
  parent: TFolder | null;
  constructor(path = '') {
    this.path = path;
    this.children = [];
    this.parent = null;
  }
}

export type TAbstractFile = TFile | TFolder;

export class Modal {
  app: any;
  contentEl: any;
  constructor(app: any) {
    this.app = app;
    this.contentEl = {
      empty: () => { },
      createEl: (_tag: string, _opts?: any) => ({ addEventListener: () => { } })
    };
  }
  open() {
    if (typeof (this as any).onOpen === 'function') {
      (this as any).onOpen();
    }
  }
  close() {
    if (typeof (this as any).onClose === 'function') {
      (this as any).onClose();
    }
  }
}

export class Menu {
  items: any[];
  constructor() {
    this.items = [];
  }
  addItem(callback: any) {
    const item = {
      setTitle: (_title: string) => item,
      setIcon: (_icon: string) => item,
      onClick: (handler: any) => {
        item._onClick = handler;
        return item;
      },
      _onClick: null as any
    };
    callback(item);
    this.items.push(item);
    return this;
  }
}

export class App {
  vault: any;
  workspace: any;
  fileManager: any;
  constructor() {
    this.vault = {
      getMarkdownFiles: () => [],
      rename: async (_file: TFile, _newPath: string) => { },
      getAbstractFileByPath: (_path: string) => null
    };
    this.workspace = {
      on: (event: string, callback: any) => { },
      onLayoutReady: (callback: any) => callback(),
      getActiveFile: () => null,
      getActiveViewOfType: (_type: any) => null,
      iterateAllLeaves: (_callback: any) => { }
    };
    this.fileManager = {
      processFrontMatter: async (file: TFile, callback: any) => { }
    };
  }
}

export class Notice {
  constructor(message: string, timeout?: number) { }
}

export class MarkdownView {
  editor: any;
}
