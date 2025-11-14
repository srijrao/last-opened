# Last Opened Plugin for Obsidian

Automatically tracks when you open and close notes by adding `date_last_opened` and `date_last_closed` timestamps to your notes' frontmatter.

## Features

- **Automatic Tracking**: Timestamps are added to your note's frontmatter whenever you open or close a file
- **ISO 8601 Format**: Uses `YYYY-MM-DDTHH:mm:ss` format for easy sorting and filtering
- **Non-intrusive**: Works silently in the background without disrupting your workflow

## Usage

Once installed and enabled, the plugin will automatically:

1. Add or update `date_last_opened` when you open a note
2. Add or update `date_last_closed` when you switch to another note or close the file

Example frontmatter after using the plugin:

```yaml
---
date_last_opened: 2025-11-14T10:30:45
date_last_closed: 2025-11-14T10:35:12
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
