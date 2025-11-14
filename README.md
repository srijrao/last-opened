## Last Opened Plugin

### Overview
This plugin operates on notes in Obsidian that contain specific YAML keys. By default, it uses the keys already assigned in the plugin, but these keys are configurable by the user.

### Features
- **Selective Operation:** The plugin only processes notes that have the specified YAML keys. The list of keys is user-configurable, with sensible defaults provided.
    - Enable one, or both.
    - When updating the timestamp, the plugin will only update the ones present, not forcing both if there is only key present
- **YAML Key Command:** A command is available to add the required keys to a note's YAML frontmatter. If the note does not already have YAML, the plugin will create it automatically.
    - Either add both yaml keys, or commands for adding each key individually
    - **Accurate Timestamps:** When adding keys to a note that was opened earlier, the plugin uses the actual opening time, not the time when the command was run
- **Performance Optimization:** The plugin only makes changes to notes when they are opened or closed, reducing unnecessary processing and improving performance.
- **Configurable Keys:** Users can change which YAML keys the plugin looks for and manages, but the default set matches the initial configuration. 
    - `date_last_opened` and `date_last_closed` as defaults.
- **Configurable Time Formats** Users can define the time format used in the timestamp. UTC, local with UTC offset, one timezone in particular, different moment.js formats, etc. 
    - ISO 8601 Format with local offset as default

### Future Plans
- **Additional Timestamps:** Future versions may add support for tracking and adding timestamps for other events in the YAML frontmatter. This is not included in the current version.

---

## Architecture Guide for Developers

This codebase is structured to be beginner-friendly while maintaining clean separation of concerns. Each file has a specific responsibility:

### File Structure

```
src/
├── main.ts           # Plugin entry point and coordinator
├── settings.ts       # Settings interface and defaults
├── timestamp.ts      # Timestamp generation logic
├── fileHandler.ts    # YAML frontmatter operations
├── eventHandler.ts   # Event listener setup
└── commands.ts       # User-facing commands
```

### Module Descriptions

#### `main.ts` - The Conductor
**Responsibility:** Bootstrap and coordinate all modules

This is the entry point. When Obsidian loads the plugin, the `onload()` method is called. It:
1. Loads settings from persistent storage
2. Creates instances of helper modules
3. Sets up event handlers and commands

Think of it as the "main" function—it orchestrates everything but doesn't do the actual work.

**Key concepts for beginners:**
- `onload()` - Called when plugin starts
- `onunload()` - Called when plugin stops
- `loadSettings()` - Reads configuration from disk

#### `settings.ts` - The Configuration
**Responsibility:** Define what settings are available and provide sensible defaults

Contains:
- `LastOpenedSettings` interface (describes all possible settings)
- `DEFAULT_SETTINGS` constant (safe defaults)
- `validateSettings()` function (catches corrupted data)

**Example settings:**
```typescript
{
  dateOpenedKey: 'date_last_opened',    // YAML key for tracking opens
  dateClosedKey: 'date_last_closed',    // YAML key for tracking closes
  dateFormat: 'YYYY-MM-DDTHH:mm:ssZ',   // ISO 8601 with timezone offset
  trackOpened: true,                    // Enable open tracking?
  trackClosed: true,                    // Enable close tracking?
  timezone: 'local'                     // 'local', 'utc', or IANA timezone
}
```

**Key concepts for beginners:**
- `interface` - A blueprint that describes the shape of an object
- Defaults - Safe starting values if user hasn't configured anything
- Validation - Ensures data integrity

#### `timestamp.ts` - The Time Formatter
**Responsibility:** Generate properly formatted timestamps

Contains the `TimestampGenerator` class which:
- `generateTimestamp()` - Creates a timestamp string for the current moment
- Helper methods for different format types

**Example output:**
```
"2025-11-14T15:30:45-05:00"  // ISO 8601 with timezone offset
"2025-11-14T15:30:45"        // ISO 8601 without timezone
"2025-11-14T20:30:45.000Z"   // UTC
```

**Key concepts for beginners:**
- Class - Bundles related methods together
- Dependency injection - Pass in settings so the class knows how to format
- Helper methods (private) - Internal utilities not exposed outside the class

#### `fileHandler.ts` - The File Updater
**Responsibility:** Handle all YAML frontmatter operations

Contains the `FileHandler` class which:
- `updateDateOpened()` - Record opening timestamp (only if enabled)
- `updateDateClosed()` - Record closing timestamp (only if enabled)
- `addYAMLKeys()` - Add YAML keys to a note (for the user command)
- `hasTrackedKeys()` - Check if a file belongs to this plugin
- `updateFrontmatterProperty()` - Internal method that does the actual update

**Important safety feature:** Only modifies files that already have one of our YAML keys. This prevents accidentally adding keys to notes that shouldn't be tracked.

**Key concepts for beginners:**
- Error handling - Try/catch to prevent crashes
- Conditional execution - Check settings before making changes
- Single responsibility - This file only cares about file operations

#### `eventHandler.ts` - The Event Listener
**Responsibility:** Listen for Obsidian events and respond appropriately

Contains the `EventHandler` class which:
- `registerEvents()` - Set up all event listeners
- `handleFileOpen()` - Logic for when a file opens
- `handleApplicationClose()` - Logic for when Obsidian closes

**Events this listens for:**
- `file-open` - User opens a note (emitted by Obsidian)
- `beforeunload` - Browser is closing (catches force-quit scenarios)

**Key concepts for beginners:**
- Events - Things that happen (user actions, system events)
- Event listeners/handlers - Functions that run when events occur
- State tracking - `lastActiveFile` remembers which file was open

#### `commands.ts` - User Actions
**Responsibility:** Define commands users can run from the command palette

Contains the `CommandRegistry` class which:
- `registerCommands()` - Set up all available commands
- `registerAddKeysCommands()` - Three variants for adding YAML keys

**Available commands:**
1. "Add last-opened and last-closed keys" - Adds both keys with current timestamp
2. "Add only last-opened key" - Adds just the opened key
3. "Add only last-closed key" - Adds just the closed key

**How users access them:**
1. Press `Ctrl+P` (or `Cmd+P` on Mac)
2. Type "last opened" to filter
3. Select a command and press Enter

**Key concepts for beginners:**
- Commands - User-triggered actions
- Notices - Toast-style notifications to give feedback
- Try/catch - Graceful error handling

---

## How It All Works Together

Here's the execution flow:

```
User installs plugin
         ↓
main.ts loads and calls onload()
         ↓
Loads settings from disk
         ↓
Creates TimestampGenerator (knows how to format time)
         ↓
Creates FileHandler (knows how to modify files)
         ↓
Sets up EventHandlers (listens for file opens/closes)
         ↓
Sets up Commands (listens for user requests)
         ↓
Plugin is ready!

When user opens a file:
  EventHandler detects file-open event
         ↓
  Calls FileHandler.updateDateOpened()
         ↓
  FileHandler calls TimestampGenerator for current time
         ↓
  FileHandler checks if file has our YAML keys
         ↓
  If yes, updates the YAML with new timestamp
         ↓
  Done!
```

---

## Learning Path for Beginners

If you're learning from this codebase, here's the suggested order:

1. **Start with `settings.ts`**
   - Simple file
   - Understand interfaces and constants
   - Learn what data the plugin needs

2. **Read `timestamp.ts`**
   - See how to handle dates in JavaScript
   - Understand string formatting
   - Learn about helper methods

3. **Review `fileHandler.ts`**
   - Learn how to interact with Obsidian's API
   - See conditional logic in action
   - Understand validation patterns

4. **Study `eventHandler.ts`**
   - Learn how event listeners work
   - See state management (`lastActiveFile`)
   - Understand error handling

5. **Look at `commands.ts`**
   - See how to create user-facing features
   - Learn about user feedback (Notices)
   - Understand command registration

6. **Finally, examine `main.ts`**
   - See how all modules work together
   - Understand initialization patterns
   - Learn the Obsidian Plugin API lifecycle

---

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

The plugin can be configured through Obsidian's settings panel:

1. Open Settings (Ctrl+,)
2. Go to "Community plugins" → "Last Opened"
3. Configure the following options:

### YAML Keys
- **Opened Key**: Name of the YAML key for tracking opening times (default: `date_last_opened`)
- **Closed Key**: Name of the YAML key for tracking closing times (default: `date_last_closed`)
- **Note**: Leaving fields empty will automatically use the default values

### Time Format
- **Date Format**: Timestamp format using moment.js style (default: `YYYY-MM-DDTHH:mm:ssZ`)
- **Timezone**: Whether to use local time with offset or UTC (default: `local`)
- **Note**: Leaving the format field empty will use the ISO 8601 standard format

### Tracking Options
- **Track Openings**: Enable/disable recording of opening timestamps
- **Track Closings**: Enable/disable recording of closing timestamps

## Data Persistence

The plugin automatically saves opening times across Obsidian restarts, ensuring accurate timestamps even when you add tracking keys to notes that were opened in previous sessions.

**Data Retention:** Opening times are automatically cleaned up after 48 hours to keep memory usage low and data relevant. Only recent file interactions are retained.

## Template Usage

The plugin is designed to work well with note templates. You can create templates with empty YAML keys that the plugin will automatically populate:

```yaml
---
date_last_opened: 
date_last_closed: 
tags: template/daily-note
---

# Daily Note Template

Today's date: {{date}}

## Tasks
- [ ] Task 1
- [ ] Task 2
```

When you create a new note from this template and open it, the plugin will fill in the timestamps automatically.

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
date_last_opened: 2025-11-14T15:30:45-05:00
date_last_closed: 2025-11-14T15:32:12-05:00
other_field: your other metadata
---

# Your Note Content
```

### The timestamps will update automatically

- **date_last_opened** updates every time you open the note
- **date_last_closed** updates when you switch to another note or close Obsidian

### Accurate timestamp recording

The plugin tracks opening times for all notes, even those without YAML keys. This ensures that when you later decide to add tracking keys to a note you opened earlier, the `date_last_opened` will reflect the actual time you opened it, not when you ran the command.

**Example scenario:**
1. At 2:00 PM: You open "My Note.md" (no YAML keys yet)
2. At 2:05 PM: You decide to add tracking, run "Add last-opened and last-closed keys"
3. Result: `date_last_opened` shows 2:00 PM (when you actually opened it), `date_last_closed` shows 2:05 PM (when you ran the command)

---

## Code Comments

All code includes detailed comments explaining:
- What each file/class/function does
- How to use it
- Why it's designed that way
- Examples for beginners

When learning or debugging, read the comments first—they're written for someone new to the code.

---

## License

MIT