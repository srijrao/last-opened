## Last Opened Plugin

Track open/close timestamps in note frontmatter, manage UID properties, and run folder-level file extension conversions from the File Explorer context menu.

## Features

- Timestamp tracking for note open and note close events.
- Optional focus tracking inside the same tab group using `last_view` and `last_unfocus` (key names are configurable).
- Selective updates for open/close keys: automatic tracking only updates notes that already contain tracked keys.
- Command palette tools to add timestamp keys (`both`, `opened only`, `closed only`).
- History depth for timestamp keys (`1-5`) with numbered keys such as `last_opened_1`, `last_opened_2`, etc.
- Per-note history override via frontmatter keys like `<openedKey>_history` and `<closedKey>_history`.
- Automatic `types.json` registration for tracked datetime properties.
- UID generation tools for the current note and current folder.
- Duplicate UID scanner across all markdown files in the vault.
- Daily-note append commands for highlighted text and wikilinks to the active note.
- File Explorer context-menu actions to convert file extensions (`.md`, `.txt`, and custom extension mapping).
- Folder operations support recursion modes: not recursive, fully recursive, ask each time, or depth-limited.

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

## Configuration

Open Obsidian Settings -> Community plugins -> Last Opened.

### YAML keys

- Opened key (default: `last_opened`)
- Closed key (default: `last_closed`)
- Empty values are normalized back to defaults.

### Time format

- Timestamp mode:
  - `local-iso-offset` (ISO 8601 local time with UTC offset, e.g. `2025-11-11T14:00:00-06:00`)
  - `utc-iso` (ISO UTC, e.g. `2025-11-11T20:00:00.000Z`)

### Tracking options

- Track openings (`trackOpened`)
- Track closings (`trackClosed`)
- Track focus changes inside the same tab group (`trackFocusChanges`)
- Last view key (default: `last_view`)
- Last unfocus key (default: `last_unfocus`)
- History depth slider (`1-5`)
- Show notifications toggle

### Daily note options

- Append source:
  - `Textbox format` uses the append text format setting.
  - `Template note in templates folder` reads a template note and inserts content into its placeholder.
- Append text format (default: `{{text}}`)
- Template note path (default: `templates/Append Template`)
- Both `{{text}}` and `{text}` placeholders are replaced with the highlighted text or wikilink.

### UID options

- UID key name (default: `uid`)
- UID length (`4-32`, default `8`)

### File extension options

- Custom convert from extension (default: `md`)
- Custom convert to extension (default: `txt`)

### Folder operation options

- Recursion mode:
  - `not-recursive`
  - `fully-recursive`
  - `ask`
  - `depth`
- Recursion depth (`1-10`)
- Whether ask-mode includes a depth choice

### Reset

- Reset button restores all settings to defaults.

## Commands

Command palette commands:

1. Add last-opened and last-closed keys
2. Add only last-opened key
3. Add only last-closed key
4. Append highlighted text to current day's daily note
5. Append wikilink to current day's daily note
6. Add unique ID to YAML if not present
7. Add/Replace unique ID to YAML
8. Add unique ID to YAML if not present to folder
9. Add/Replace unique ID to YAML to folder
10. Find files with duplicate unique IDs

File Explorer context-menu actions:

- For files:
  - Change extension to `.txt`
  - Change extension to `.md`
- For folders:
  - Change all `.txt` files to `.md`
  - Change all `.md` files to `.txt`
  - Change all custom extension files

## Frontmatter Examples

Basic keys:

```yaml
---
last_opened: 2026-03-13T11:10:09-05:00
last_closed: 2026-03-13T11:27:02-05:00
---
```

History depth example:

```yaml
---
last_opened: 2026-03-13T11:10:09-05:00
last_opened_1: 2026-03-13T11:10:09-05:00
last_opened_2: 2026-03-12T18:41:44-05:00
last_closed: 2026-03-13T11:27:02-05:00
last_closed_1: 2026-03-13T11:27:02-05:00
uid: a2f83k1z
---
```

Per-note depth override:

```yaml
---
last_opened_history: 3
last_closed_history: 2
---
```

## How Tracking Works

- On workspace layout changes, the plugin compares currently open files against the previously tracked set.
- Newly opened files get open timestamps.
- Newly closed files get close timestamps.
- On app close (`beforeunload`), close timestamps are attempted for remaining tracked open files.
- The add-key commands can use the recorded opening time so `last_opened` reflects when the file actually opened, not only when the command is executed.
- Daily-note append commands use Obsidian's Daily Notes settings to find or create today's note before appending text.

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

### Development Workflow

When developing locally:

1. Run `npm run dev` - This watches for changes and rebuilds automatically
2. Reload the plugin in Obsidian (Ctrl+R or use the plugin manager)
3. Check the console for any errors (Ctrl+Shift+I)

The dev build creates a `main.js` file in the root directory, which Obsidian loads.

---

## Example Usage

### Setting up a note to track opening/closing

1. Open a note in Obsidian
2. Open command palette (Ctrl+P / Cmd+P)
3. Search for "last opened"
4. Select "Add last-opened and last-closed keys"
5. The YAML frontmatter is created with initial timestamps

Example result:

```yaml
---
last_opened: 2025-11-14T15:30:45-05:00
last_closed: 2025-11-14T15:32:12-05:00
other_field: your other metadata
---
# Your Note Content
```

### The timestamps will update automatically

- `last_opened` updates when you first open a note in the current Obsidian session
- `last_closed` updates when you close the last tab of a note or close Obsidian

### Accurate timestamp recording

The plugin tracks opening times for all notes, even those without YAML keys. This ensures that when you later decide to add tracking keys to a note you opened earlier, the `last_opened` value will reflect the actual time you opened it, not when you ran the command.

**Example scenario:**

1. At 2:00 PM: You open "My Note.md" (no YAML keys yet)
2. At 2:05 PM: You decide to add tracking, run "Add last-opened and last-closed keys"
3. Result: `last_opened` shows 2:00 PM (when you actually opened it), `last_closed` shows 2:05 PM (when you ran the command)

---

## Architecture

Core modules:

- `main.ts`: plugin bootstrap, settings tab, dependency wiring
- `settings.ts`: settings schema, defaults, validation
- `timestamp.ts`: timestamp formatting
- `fileHandler.ts`: frontmatter updates and `types.json` registration
- `eventHandler.ts`: workspace and app lifecycle event handling
- `commands.ts`: command palette command registration
- `dailyNoteHandler.ts`: Daily Notes lookup, creation, and append formatting
- `uidHandler.ts`: UID generation, folder updates, duplicate scan
- `extensionHandler.ts`: file/folder extension conversion
- `contextMenus.ts`: file explorer menu actions
- `folderUtils.ts`: recursion selection and file collection helpers

Tests are under `src/__tests__/`.

---

## License

MIT
