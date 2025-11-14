## Last Opened Plugin

### Overview
This plugin operates on notes in Obsidian that contain specific YAML keys. By default, it uses the keys already assigned in the plugin, but these keys are configurable by the user.

### Features
- **Selective Operation:** The plugin only processes notes that have the specified YAML keys. The list of keys is user-configurable, with sensible defaults provided.
    - Enable one, or both.
    - When updating the timestamp, the plugin will only update the ones present, not forcing both if there is only key present
- **YAML Key Command:** A command is available to add the required keys to a note's YAML frontmatter. If the note does not already have YAML, the plugin will create it automatically.
    - Either add both yaml keys, or commands for adding each key individually
- **Performance Optimization:** The plugin only makes changes to notes when they are opened or closed, reducing unnecessary processing and improving performance.
- **Configurable Keys:** Users can change which YAML keys the plugin looks for and manages, but the default set matches the initial configuration. 
    - `date_last_opened` and `date_last_closed` as defaults.
- **Configurable Time Formats** Users can define the time format used in the timestamp. UTC, local with UTC offset, one timezone in particular, different moment.js formats, etc. 
    - ISO 8601 Format with local offset as default

### Future Plans
- **Additional Timestamps:** Future versions may add support for tracking and adding timestamps for other events in the YAML frontmatter. This is not included in the current version.

---
For more details, see the configuration and usage instructions in this repository.

Once installed and enabled, the plugin will automatically:

1. Add or update `date_last_opened` when you open a note
2. Add or update `date_last_closed` when you switch to another note or close the file

Example frontmatter after using the plugin:

```yaml
---
date_last_opened: 2025-11-14T10:30:45+00:00
date_last_closed: 2025-11-14T10:35:12+00:00
---
```

## Installation

### From within Obsidian

1. Open Settings → Community plugins
2. Disable Safe mode
3. Click Browse community plugins
4. Search for "Last Opened"
5. Click Install
6. Enable the plugin

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create a folder named `last-opened` in your vault's `.obsidian/plugins/` directory
3. Copy both files into the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community plugins

## Development

To build the plugin:

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
```

## License

MIT